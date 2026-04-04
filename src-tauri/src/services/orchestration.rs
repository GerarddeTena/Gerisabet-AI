//! Orchestration service — thinking → delegation → review → synthesis.
//!
//! When the user enables reasoning and/or sub-orchestrators the flow is:
//! 1. Primary model generates a brief **reasoning plan** (ai_thinking:planning)
//! 2. For each enabled sub-orchestrator a **subtask** is generated and delegated
//!    (ai_thinking:delegating → Ollama call → ai_thinking:reviewing)
//! 3. All sub-results are assembled into an enriched context
//! 4. Primary model synthesises the **final answer** (standard ai_token / ai_done stream)
//!
//! When orchestration is disabled the service falls through to the standard
//! single-model streaming path unchanged.

use crate::adapters::ollama::OllamaClient;
use crate::config::{OLLAMA_BASE_URL, STREAM_TIMEOUT_SECS};
use crate::domain::chat::HistoryEntry;
use crate::domain::orchestrator::{
    OrchestratorConfig, ReasoningStep, SubOrchestratorDef, SubOrchestratorRole, SubTaskResult,
};
use crate::error::AppError;
use crate::ports::streamer::LlmStreamer;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct OrchestratorService {
    app: AppHandle,
    primary_model: String,
    context: String,
    history: Vec<HistoryEntry>,
    config: OrchestratorConfig,
}

impl OrchestratorService {
    pub fn new(
        app: AppHandle,
        primary_model: String,
        context: String,
        history: Vec<HistoryEntry>,
        config: OrchestratorConfig,
    ) -> Self {
        Self { app, primary_model, context, history, config }
    }

    /// Run the full orchestrated pipeline and stream the final answer.
    pub async fn run(&self, question: &str) -> Result<(), AppError> {
        if !self.config.enable_reasoning && self.config.sub_orchestrators.is_empty() {
            // Fast path: standard single-model stream
            return self.stream_final(question, &self.context).await;
        }

        // ── Step 1: reasoning plan ─────────────────────────────────────────
        let plan = self.generate_plan(question).await?;
        self.emit_thinking(ReasoningStep::Planning { content: plan.clone() });

        // ── Step 2: delegate to sub-orchestrators ─────────────────────────
        let mut sub_results: Vec<SubTaskResult> = Vec::new();

        let active_subs: Vec<&SubOrchestratorDef> = self
            .config
            .sub_orchestrators
            .iter()
            .filter(|s| s.enabled)
            .collect();

        for sub in &active_subs {
            let task = subtask_prompt(question, &sub.role, &self.context);

            self.emit_thinking(ReasoningStep::Delegating {
                model: sub.model.clone(),
                role: sub.role.label().to_string(),
                task: task.clone(),
            });

            match self.call_submodel(&sub.model, &task, sub.role.system_hint()).await {
                Ok(content) => {
                    log::debug!("Sub-result from {}: {} chars", sub.model, content.len());
                    sub_results.push(SubTaskResult {
                        model: sub.model.clone(),
                        role: sub.role.clone(),
                        task,
                        content,
                    });
                }
                Err(e) => {
                    log::warn!("Sub-orchestrator {} failed: {e}", sub.model);
                }
            }
        }

        // ── Step 3: review sub-results ─────────────────────────────────────
        let enriched_context = if sub_results.is_empty() {
            self.context.clone()
        } else {
            let review_note = summarise_sub_results(&sub_results);
            self.emit_thinking(ReasoningStep::Reviewing { content: review_note.clone() });
            format!("{}\n\n=== SUB-ORCHESTRATOR INSIGHTS ===\n{}", self.context, review_note)
        };

        // ── Step 4: synthesise final answer ────────────────────────────────
        self.emit_thinking(ReasoningStep::Synthesizing);
        self.stream_final(question, &enriched_context).await
    }

    // ── Private helpers ───────────────────────────────────────────────────

    fn emit_thinking(&self, step: ReasoningStep) {
        self.app.emit("ai_thinking", &step).ok();
    }

    /// Ask the primary model to generate a short reasoning plan (non-streamed).
    async fn generate_plan(&self, question: &str) -> Result<String, AppError> {
        let prompt = format!(
            "You are a planning assistant. Given this question, write a concise 2-3 sentence \
            reasoning plan describing how you will answer it. Do NOT answer the question itself.\n\n\
            Question: {question}"
        );
        self.call_submodel(&self.primary_model, &prompt, "You are a concise planner.").await
    }

    /// Non-streaming single-turn call to any Ollama model.
    async fn call_submodel(
        &self,
        model: &str,
        prompt: &str,
        system: &str,
    ) -> Result<String, AppError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(STREAM_TIMEOUT_SECS))
            .build()
            .map_err(|e| AppError::LlmStream(format!("HTTP client error: {e}")))?;

        let body = serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user",   "content": prompt  }
            ],
            "stream": false
        });

        let res = client
            .post(format!("{OLLAMA_BASE_URL}/api/chat"))
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::LlmStream(format!("Sub-model request failed: {e}")))?;

        #[derive(Deserialize)]
        struct ChatResponse {
            message: MessageContent,
        }
        #[derive(Deserialize)]
        struct MessageContent {
            content: String,
        }

        let data: ChatResponse = res
            .json()
            .await
            .map_err(|e| AppError::LlmStream(format!("Sub-model parse error: {e}")))?;

        Ok(data.message.content)
    }

    /// Stream the final response from the primary model using the enriched context.
    async fn stream_final(&self, question: &str, enriched_context: &str) -> Result<(), AppError> {
        let ollama = OllamaClient::new()?;
        ollama
            .stream(
                question,
                enriched_context.to_string(),
                &self.primary_model,
                self.history.clone(),
                self.app.clone(),
            )
            .await
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Build a focused sub-task prompt based on the role.
fn subtask_prompt(question: &str, role: &SubOrchestratorRole, context: &str) -> String {
    let focus = match role {
        SubOrchestratorRole::Code =>
            "Focus only on code-related aspects: correctness, patterns, improvements.",
        SubOrchestratorRole::Factual =>
            "Extract and summarise the key factual information relevant to this question.",
        SubOrchestratorRole::Creative =>
            "Provide a clear, accessible explanation suitable for any reader.",
        SubOrchestratorRole::Default =>
            "Provide a concise, helpful partial answer.",
    };

    format!("{focus}\n\nContext:\n{context}\n\nQuestion: {question}\n\nPartial answer:")
}

/// Build a human-readable summary of all sub-results for the primary model to review.
fn summarise_sub_results(results: &[SubTaskResult]) -> String {
    results
        .iter()
        .map(|r| {
            format!(
                "--- {} ({}) ---\n{}",
                r.role.label(),
                r.model,
                r.content.trim()
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}
