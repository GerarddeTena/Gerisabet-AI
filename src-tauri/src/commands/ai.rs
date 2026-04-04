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

    let qdrant = QdrantStore::connect().await.map_err(|e| e.to_string())?;

    let retrieval = RetrievalService::new(
        OllamaClient::new().map_err(|e| e.to_string())?,
        qdrant,
    );

    let context = retrieval
        .build_context(&question)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

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

