use std::collections::HashSet;
use std::fs;
use serde_json;
use std::path::Path;
use std::io::Write;
const TRACKER_PATH: &str = "C:\\Users\\Gerard\\qdrant_storage\\indexed_files.json";

pub fn load_indexed_files() -> HashSet<String> {
    match fs::read_to_string(TRACKER_PATH) {
        Ok(content) => serde_json::from_str::<HashSet<String>>(&content).unwrap_or_default(),
        Err(_) => HashSet::new(),
    }
}


pub fn save_indexed_files(indexed: &HashSet<String>) -> Result<(), String> {
    if let Some(parent) = Path::new(TRACKER_PATH).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error creando directorio: {}", e))?;
    }

    let json = serde_json::to_string_pretty(indexed)
        .map_err(|e| format!("Error serializando: {}", e))?;

    // Force UTF-8 writing
    let mut file = fs::File::create(TRACKER_PATH)
        .map_err(|e| format!("Error creando archivo: {}", e))?;
    file.write_all(json.as_bytes())
        .map_err(|e| format!("Error escribiendo: {}", e))?;

    println!("Tracker guardado: {} archivos indexados", indexed.len());
    Ok(())
}

pub fn mark_as_indexed(indexed_files: &mut HashSet<String>, file_path: &str) {
    indexed_files.insert(file_path.to_string());
}

pub fn is_already_indexed(indexed: &HashSet<String>, file_path: &str) -> bool {
    indexed.contains(file_path)
}