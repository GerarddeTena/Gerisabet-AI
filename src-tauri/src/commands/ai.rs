use crate::commands::{CHAT_HISTORY, SIMILARITY_THRESHOLD, SKILLS_SIMILARITY_THRESHOLD};
use crate::embeddings::{get_embedding, stream_ollama_response};
use crate::qdrant_db::{get_client, search_context, search_skills, SkillSearchResult};
use tauri::{AppHandle, Emitter};

fn format_skill_section(skills: &[&SkillSearchResult]) -> String {
    skills
        .iter()
        .map(|s| {
            format!(
                "skill_name: {}\nskill_type: {}\nscore: {:.2}\ncontent: |\n  {}",
                s.skill_name,
                s.skill_type,
                s.score,
                s.content.lines().collect::<Vec<_>>().join("\n  ")
            )
        })
        .collect::<Vec<_>>()
        .join("\n---\n")
}

#[tauri::command]
pub async fn ask_gerisabet(app: AppHandle, question: String, model: String) -> Result<(), String> {
    println!("Querying knowledge base for: '{}'", question);

    let question_vector = get_embedding(&question).await?;
    let q_client = get_client().await?;

    let skill_results = search_skills(
        &q_client,
        question_vector.clone(),
        2,
        SKILLS_SIMILARITY_THRESHOLD,
    )
    .await
    .unwrap_or_default();
    let doc_results = search_context(&q_client, question_vector, 2, SIMILARITY_THRESHOLD)
        .await
        .unwrap_or_default();

    if skill_results.is_empty() && doc_results.is_empty() {
        return {
            app.emit(
                "ai_token",
                "No encontré información relevante en los documentos para responder a tu pregunta.",
            )
            .ok();
            app.emit("ai_done", "").ok();
            Ok(())
        };
    }

    let mut context_parts: Vec<String> = Vec::new();

    let (rules, skills): (Vec<_>, Vec<_>) =
        skill_results.iter().partition(|s| s.skill_type == "rules");

    if !rules.is_empty() {
        context_parts.push(format!(
            "=== RULES (always follow) ===\n{}",
            format_skill_section(&rules)
        ));
    }

    if !skills.is_empty() {
        context_parts.push(format!(
            "=== SKILLS (use when relevant) ===\n{}",
            format_skill_section(&skills)
        ));
    }

    // === DOCUMENTATION ===
    if !doc_results.is_empty() {
        let docs_text = doc_results
            .iter()
            .map(|res| {
                format!(
                    "source: {}\nscore: {:.2}\ncontent: |\n  {}",
                    res.file_path,
                    res.score,
                    res.text.lines().collect::<Vec<_>>().join("\n  ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n---\n");
        context_parts.push(format!("=== DOCUMENTATION ===\n{}", docs_text));
    }

    let context = context_parts.join("\n\n");
    let history = {
        let guard = CHAT_HISTORY.lock().unwrap();
        guard.clone()
    };

    stream_ollama_response(&question, context, &model, history, app.clone()).await?;
    Ok(())
}
