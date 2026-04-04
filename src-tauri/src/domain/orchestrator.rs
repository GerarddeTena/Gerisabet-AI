//! Orchestrator domain types — multi-model reasoning and delegation.

use serde::{Deserialize, Serialize};

/// Role a sub-orchestrator is specialized for.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SubOrchestratorRole {
    /// Code review, refactoring, generation
    Code,
    /// Factual lookup, summarization of retrieved docs
    Factual,
    /// Creative writing, explanation generation
    Creative,
    /// General-purpose fallback
    Default,
}

impl SubOrchestratorRole {
    pub fn label(&self) -> &'static str {
        match self {
            SubOrchestratorRole::Code => "Code Specialist",
            SubOrchestratorRole::Factual => "Factual Analyst",
            SubOrchestratorRole::Creative => "Creative Writer",
            SubOrchestratorRole::Default => "General Assistant",
        }
    }

    /// Returns a concise task-routing prompt prefix for this role.
    pub fn system_hint(&self) -> &'static str {
        match self {
            SubOrchestratorRole::Code =>
                "You are a code specialist. Focus on correctness, efficiency and best practices.",
            SubOrchestratorRole::Factual =>
                "You are a factual analyst. Summarise and extract key facts from the provided context.",
            SubOrchestratorRole::Creative =>
                "You are a creative writer. Provide clear, engaging explanations.",
            SubOrchestratorRole::Default =>
                "You are a helpful assistant. Answer concisely.",
        }
    }
}

/// A single sub-orchestrator definition supplied by the user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubOrchestratorDef {
    /// Ollama model name (e.g. "qwen2.5-coder:3b")
    pub model: String,
    /// Specialised role
    pub role: SubOrchestratorRole,
    /// Whether this sub-orchestrator is active for this request
    pub enabled: bool,
}

/// Full orchestration configuration sent with each `ask_gerisabet` call.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OrchestratorConfig {
    pub sub_orchestrators: Vec<SubOrchestratorDef>,
    /// When true the primary model emits a reasoning plan before answering.
    pub enable_reasoning: bool,
}

/// A single reasoning step emitted as an `ai_thinking` event.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case", tag = "step")]
pub enum ReasoningStep {
    Planning   { content: String },
    Delegating { model: String, role: String, task: String },
    Reviewing  { content: String },
    Synthesizing,
}

/// Result collected from one sub-orchestrator invocation.
#[derive(Debug, Clone)]
pub struct SubTaskResult {
    pub model: String,
    pub role: SubOrchestratorRole,
    pub task: String,
    pub content: String,
}
