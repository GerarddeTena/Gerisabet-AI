use glob::glob;
use pdf_extract::extract_text;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

// [🟡 Logic] Límite de tamaño: 50 MB
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;

#[derive(Serialize, Clone)]
pub struct Document {
    pub route: String,
    pub content: String,
    pub file_type: String,
}

pub fn scan_dir(base_path: &str) -> Vec<Document> {
    let pattern = format!("{}/**/*.*", base_path);
    let mut library = Vec::new();

    if let Ok(entries) = glob(&pattern) {
        for entry in entries {
            if let Ok(path) = entry {
                if path.is_file() {
                    match file_process(&path) {
                        Ok(doc) => library.push(doc),
                        // [🟡 Logic] Uso de eprintln! para errores
                        Err(e) => eprintln!("Saltando archivo {:?}: {}", path, e),
                    }
                }
            }
        }
    }
    library
}

fn file_process(route: &PathBuf) -> Result<Document, String> {
    let extension = route
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // [🟡 Logic] File size guard
    if let Ok(metadata) = fs::metadata(route) {
        if metadata.len() > MAX_FILE_SIZE {
            return Err(format!(
                "Archivo supera el límite de 50MB ({} bytes)",
                metadata.len()
            ));
        }
    } else {
        return Err("No se pudieron leer los metadatos del archivo".to_string());
    }

    let content = match extension.as_str() {
        "pdf" => extract_text(route).map_err(|_| "PDF corrupto o protegido".to_string())?,
        "ts" | "cs" | "md" | "txt" => {
            fs::read_to_string(route).map_err(|_| "Error de lectura de texto".to_string())?
        }
        _ => return Err("Formato no soportado".to_string()),
    };

    Ok(Document {
        route: route.to_string_lossy().to_string(),
        content,
        file_type: extension,
    })
}
