//! System info command — hardware/OS scanning and live Ollama model discovery.

use serde::Serialize;
use sysinfo::System;

/// Hardware and OS summary returned to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    pub ram_total_gb: f64,
    pub ram_available_gb: f64,
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub os_name: String,
    pub os_version: String,
}

/// An Ollama model entry returned by `/api/tags`.
#[derive(Debug, Clone, Serialize)]
pub struct OllamaModelInfo {
    pub name: String,
    /// Raw size in bytes as reported by Ollama (0 when unknown).
    pub size_bytes: u64,
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Scan the host hardware and return RAM, CPU and OS details.
#[tauri::command]
pub fn scan_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let ram_total_gb = sys.total_memory() as f64 / 1_073_741_824.0;
    let ram_available_gb = sys.available_memory() as f64 / 1_073_741_824.0;

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());

    let cpu_cores = sys.cpus().len();

    let os_name = System::long_os_version().unwrap_or_else(|| "Unknown OS".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "".to_string());

    SystemInfo {
        ram_total_gb,
        ram_available_gb,
        cpu_brand,
        cpu_cores,
        os_name,
        os_version,
    }
}

/// Fetch the list of locally available Ollama models.
///
/// Returns an empty list (not an error) when Ollama is unreachable.
#[tauri::command]
pub async fn get_available_models() -> Vec<OllamaModelInfo> {
    match fetch_ollama_models().await {
        Ok(models) => models,
        Err(e) => {
            log::warn!("Could not fetch Ollama models: {e}");
            vec![]
        }
    }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaTagEntry>,
}

#[derive(serde::Deserialize)]
struct OllamaTagEntry {
    name: String,
    size: Option<u64>,
}

async fn fetch_ollama_models() -> Result<Vec<OllamaModelInfo>, reqwest::Error> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()?;

    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await?;

    let tags: OllamaTagsResponse = response.json().await?;

    Ok(tags
        .models
        .into_iter()
        .map(|m| OllamaModelInfo {
            name: m.name,
            size_bytes: m.size.unwrap_or(0),
        })
        .collect())
}
