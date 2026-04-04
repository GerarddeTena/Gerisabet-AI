//! AI command handler — thin wrapper over RetrievalService + OrchestratorService.

use crate::adapters::qdrant::QdrantStore;
use crate::adapters::ollama::OllamaClient;
use crate::commands::ChatState;
use crate::config::MAX_HISTORY_MESSAGES;
use crate::domain::orchestrator::OrchestratorConfig;
use crate::services::retrieval::RetrievalService;
use crate::services::orchestration::OrchestratorService;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn ask_gerisabet(
    app: AppHandle,
    state: State<'_, ChatState>,
    question: String,
    model: String,
    orchestrators: Option<OrchestratorConfig>,
) -> Result<(), String> {
    log::debug!("ask_gerisabet: question={:?}", &question[..question.len().min(80)]);

    // Attempt to build RAG context. If Qdrant or Ollama embeddings are unavailable
    // (e.g. Qdrant not started, cold boot) we degrade gracefully to zero context
    // rather than failing the entire request. The model will still answer from its
    // own parametric knowledge.
    let context = match QdrantStore::connect().await {
        Ok(qdrant) => {
            match OllamaClient::new() {
                Ok(ollama) => {
                    match RetrievalService::new(ollama, qdrant)
                        .build_context(&question)
                        .await
                    {
                        Ok(ctx) => ctx.unwrap_or_default(),
                        Err(e) => {
                            log::warn!("Context build failed, proceeding without RAG: {e}");
                            String::new()
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Ollama embed client unavailable, proceeding without RAG: {e}");
                    String::new()
                }
            }
        }
        Err(e) => {
            log::warn!("Qdrant unavailable, answering without RAG context: {e}");
            String::new()
        }
    };

    let history = {
        let svc = state.0.lock().await;
        svc.recent_history(MAX_HISTORY_MESSAGES)
    };

    log::debug!("Context: {} chars, History: {} entries", context.len(), history.len());

    let config = orchestrators.unwrap_or_default();

    OrchestratorService::new(app, model, context, history, config)
        .run(&question)
        .await
        .map_err(|e| e.to_string())
}

