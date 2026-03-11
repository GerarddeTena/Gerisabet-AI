use qdrant_client::Qdrant;
use qdrant_client::qdrant::{
    CreateCollectionBuilder, Distance, PointStruct,
    VectorParamsBuilder, SearchPointsBuilder, UpsertPointsBuilder, Value,
};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

pub const COLLECTION_NAME: &str = "gerisabet_library";
const VECTOR_SIZE: u64 = 768; // Dimensión para nomic-embed-text

#[derive(Debug, Serialize, Deserialize)]
pub struct QdrantSearchResult {
    pub text: String,
    pub file_path: String,
    pub score: f32,
}

pub async fn get_client() -> Result<Qdrant, String> {
    let client = Qdrant::from_url("http://localhost:6334")
        .build()
        .map_err(|e| format!("Error construyendo cliente: {}", e))?;

    client.health_check()
        .await
        .map_err(|e| format!("Qdrant no responde: {}", e))?;

    Ok(client)
}

pub async fn init_collection(client: &Qdrant) -> Result<(), String> {
    let exists = client.collection_exists(COLLECTION_NAME)
        .await
        .map_err(|e| e.to_string())?;

    if !exists {
        client.create_collection(
            CreateCollectionBuilder::new(COLLECTION_NAME)
                .vectors_config(VectorParamsBuilder::new(VECTOR_SIZE, Distance::Cosine))
        )
        .await
        .map_err(|e| format!("Error creando colección: {}", e))?;
    }
    Ok(())
}

pub async fn upsert_chunk(
    client: &Qdrant,
    text: &str,
    file_path: &str,
    vector: Vec<f32>,
) -> Result<(), String> {
    let mut payload: HashMap<String, Value> = HashMap::new();
    payload.insert("text".to_string(), text.into());
    payload.insert("file_path".to_string(), file_path.into());

    let unique_str = format!("{}-{}", file_path, text);
    let deterministic_uuid = uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_OID, unique_str.as_bytes());

    let point = PointStruct::new(
        deterministic_uuid.to_string(),
        vector,
        payload,
    );

    client.upsert_points(
        UpsertPointsBuilder::new(COLLECTION_NAME, vec![point])
    )
    .await
    .map_err(|e| format!("Error en upsert: {}", e))?;

    Ok(())
}

pub async fn search_context(
    client: &Qdrant,
    query_vector: Vec<f32>,
    limit: u64,
    threshold: f32,
) -> Result<Vec<QdrantSearchResult>, String> {
    let safe_limit = if limit == 0 { 3 } else if limit > 50 { 50 } else { limit };

let search_result = client.search_points(
    SearchPointsBuilder::new(COLLECTION_NAME, query_vector, safe_limit)
        .score_threshold(threshold)
        .with_payload(true)
)
.await
.map_err(|e| format!("Error buscando: {}", e))?;

    let mut contexts = Vec::new();
    for point in search_result.result {
        let text = match point.payload.get("text").and_then(|v| v.as_str()) {
            Some(t) => t.to_string(),
            None => {
                eprintln!("Warning: 'text' faltante en punto con score {}", point.score);
                continue;
            }
        };
        let file_path = match point.payload.get("file_path").and_then(|v| v.as_str()) {
            Some(p) => p.to_string(),
            None => {
                eprintln!("Warning: 'file_path' faltante en punto con score {}", point.score);
                "Ruta_desconocida".to_string()
            }
        };
        contexts.push(QdrantSearchResult { text, file_path, score: point.score });
    }
    Ok(contexts)
}
