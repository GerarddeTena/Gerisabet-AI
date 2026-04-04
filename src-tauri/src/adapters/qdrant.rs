//! Qdrant adapter — implements [`VectorStore`].

use crate::config::{LIBRARY_COLLECTION, QDRANT_URL, SKILLS_COLLECTION, VECTOR_SIZE};
use crate::domain::search::{DocSearchResult, SkillSearchResult};
use crate::error::AppError;
use crate::ports::vector_store::VectorStore;
use qdrant_client::qdrant::{
    CreateCollectionBuilder, Distance, PointStruct, SearchPointsBuilder, UpsertPointsBuilder,
    VectorParamsBuilder, Value,
};
use qdrant_client::Qdrant;
use std::collections::HashMap;

/// Qdrant vector database adapter.
pub struct QdrantStore {
    client: Qdrant,
}

impl QdrantStore {
    /// Connect to Qdrant and verify reachability.
    pub async fn connect() -> Result<Self, AppError> {
        let client = Qdrant::from_url(QDRANT_URL)
            .build()
            .map_err(|e| AppError::VectorStore(format!("Build error: {e}")))?;

        match client.health_check().await {
            Ok(_) => {}
            Err(e) => {
                let msg = e.to_string();
                // Qdrant sometimes returns a version-compatibility warning — not fatal
                if !msg.contains("compatibility") && !msg.contains("version") {
                    return Err(AppError::VectorStore(format!("Health check failed: {msg}")));
                }
                log::warn!("Qdrant version warning (ignored): {msg}");
            }
        }

        Ok(Self { client })
    }
}

fn make_uuid(seed: &str) -> String {
    uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_OID, seed.as_bytes()).to_string()
}

impl VectorStore for QdrantStore {
    async fn init_library(&self) -> Result<(), AppError> {
        let exists: bool = self
            .client
            .collection_exists(LIBRARY_COLLECTION)
            .await
            .map_err(|e| AppError::VectorStore(e.to_string()))?;

        if !exists {
            self.client
                .create_collection(
                    CreateCollectionBuilder::new(LIBRARY_COLLECTION)
                        .vectors_config(VectorParamsBuilder::new(VECTOR_SIZE, Distance::Cosine)),
                )
                .await
                .map_err(|e| AppError::VectorStore(format!("Create library collection: {e}")))?;
        }
        Ok(())
    }

    async fn upsert_doc(
        &self,
        text: &str,
        file_path: &str,
        vector: Vec<f32>,
    ) -> Result<(), AppError> {
        let mut payload: HashMap<String, Value> = HashMap::new();
        payload.insert("text".to_string(), text.into());
        payload.insert("file_path".to_string(), file_path.into());

        let point = PointStruct::new(make_uuid(&format!("{file_path}-{text}")), vector, payload);

        self.client
            .upsert_points(UpsertPointsBuilder::new(LIBRARY_COLLECTION, vec![point]))
            .await
            .map_err(|e| AppError::VectorStore(format!("Upsert doc failed: {e:?}")))?;

        Ok(())
    }

    async fn search_docs(
        &self,
        query_vector: Vec<f32>,
        limit: u64,
        threshold: f32,
    ) -> Result<Vec<DocSearchResult>, AppError> {
        let safe_limit = limit.clamp(1, 50);

        let result = self
            .client
            .search_points(
                SearchPointsBuilder::new(LIBRARY_COLLECTION, query_vector, safe_limit)
                    .score_threshold(threshold)
                    .with_payload(true),
            )
            .await
            .map_err(|e| AppError::VectorStore(format!("Search docs failed: {e}")))?;

        let mut docs = Vec::new();
        for point in result.result {
            let text = match point.payload.get("text").and_then(|v| v.as_str()) {
                Some(t) => t.to_string(),
                None => {
                    log::warn!("Missing 'text' in library point (score {})", point.score);
                    continue;
                }
            };
            let file_path = match point
                .payload
                .get("file_path")
                .and_then(|v| v.as_str())
            {
                Some(p) => p.to_string(),
                None => "unknown".to_string(),
            };

            docs.push(DocSearchResult {
                text,
                file_path,
                score: point.score,
            });
        }
        Ok(docs)
    }

    async fn init_skills(&self) -> Result<(), AppError> {
        let exists: bool = self
            .client
            .collection_exists(SKILLS_COLLECTION)
            .await
            .map_err(|e| AppError::VectorStore(e.to_string()))?;

        if !exists {
            self.client
                .create_collection(
                    CreateCollectionBuilder::new(SKILLS_COLLECTION)
                        .vectors_config(VectorParamsBuilder::new(VECTOR_SIZE, Distance::Cosine)),
                )
                .await
                .map_err(|e| AppError::VectorStore(format!("Create skills collection: {e}")))?;
        }
        Ok(())
    }

    async fn upsert_skill(
        &self,
        content: &str,
        skill_name: &str,
        skill_type: &str,
        vector: Vec<f32>,
    ) -> Result<(), AppError> {
        let mut payload: HashMap<String, Value> = HashMap::new();
        payload.insert("content".to_string(), content.into());
        payload.insert("skill_name".to_string(), skill_name.into());
        payload.insert("skill_type".to_string(), skill_type.into());

        let point = PointStruct::new(
            make_uuid(&format!("{skill_type}-{skill_name}-{content}")),
            vector,
            payload,
        );

        self.client
            .upsert_points(UpsertPointsBuilder::new(SKILLS_COLLECTION, vec![point]))
            .await
            .map_err(|e| AppError::VectorStore(format!("Upsert skill failed: {e:?}")))?;

        Ok(())
    }

    async fn search_skills(
        &self,
        query_vector: Vec<f32>,
        limit: u64,
        threshold: f32,
    ) -> Result<Vec<SkillSearchResult>, AppError> {
        let safe_limit = limit.clamp(1, 50);

        let result = self
            .client
            .search_points(
                SearchPointsBuilder::new(SKILLS_COLLECTION, query_vector, safe_limit)
                    .score_threshold(threshold)
                    .with_payload(true),
            )
            .await
            .map_err(|e| AppError::VectorStore(format!("Search skills failed: {e}")))?;

        let mut skills = Vec::new();
        for point in result.result {
            let content = match point.payload.get("content").and_then(|v| v.as_str()) {
                Some(c) => c.to_string(),
                None => {
                    log::warn!("Missing 'content' in skills point (score {})", point.score);
                    continue;
                }
            };
            let skill_name = match point
                .payload
                .get("skill_name")
                .and_then(|v| v.as_str())
            {
                Some(n) => n.to_string(),
                None => "unknown".to_string(),
            };
            let skill_type = match point
                .payload
                .get("skill_type")
                .and_then(|v| v.as_str())
            {
                Some(t) => t.to_string(),
                None => "unknown".to_string(),
            };

            skills.push(SkillSearchResult {
                content,
                skill_name,
                skill_type,
                score: point.score,
            });
        }
        Ok(skills)
    }
}
