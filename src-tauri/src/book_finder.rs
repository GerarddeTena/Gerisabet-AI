use glob::glob;
use std::fs;
use std::path::PathBuf;
use pdf_extract::extract_text;
use serde::Serialize; // Necesario si vas a devolver esto al frontend

#[derive(Serialize, Clone)] // Añade Clone y Serialize
pub struct Document {
    pub route: String,
    pub content: String,
    pub file_type: String,
}

pub fn scan_dir(base_path: &str) -> Vec<Document> { // Tipado correcto
    let pattern = format!("{}/**/*.*", base_path);
    let mut library = Vec::new();

    if let Ok(entries) = glob(&pattern) {
        for entry in entries {
            if let Ok(path) = entry {
                if path.is_file() {
                    // CORRECCIÓN: Llamada correcta a la función pasando la referencia
                    match file_process(&path) {
                        Ok(doc) => library.push(doc),
                        Err(e) => println!("Skipping file {:?}: {}", path, e),
                    }
                }
            }
        }
    }
    library
}

fn file_process(route: &PathBuf) -> Result<Document, String> { // Tipado Result correcto
    let extension = route.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // CORRECCIÓN: Punto añadido antes de map_err y comas corregidas
    let content = match extension.as_str() {
        "pdf" => extract_text(route).map_err(|_| "corrupted PDF".to_string())?,
        "ts" | "cs" | "md" | "txt" => fs::read_to_string(route).map_err(|_| "Error lectura".to_string())?,
        _ => return Err("Unsupported format".to_string()),
    };

    Ok(Document {
        route: route.to_string_lossy().to_string(),
        content,
        file_type: extension,
    })
}
