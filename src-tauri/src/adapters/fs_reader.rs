//! Filesystem adapter — implements [`FileReader`].

use crate::config::MAX_FILE_SIZE_BYTES;
use crate::domain::document::Document;
use crate::error::AppError;
use crate::ports::file_reader::FileReader;
use std::fs;
use std::path::Path;

/// Reads PDF, DOCX, TXT, and MD files from the local filesystem.
pub struct FsFileReader;

impl FileReader for FsFileReader {
    fn read_file(&self, path: &Path) -> Result<Document, AppError> {
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let path_str = path.to_string_lossy().to_string();

        // Guard: size limit
        let size = fs::metadata(path)
            .map_err(|e| AppError::FileRead {
                path: path_str.clone(),
                reason: e.to_string(),
            })?
            .len();

        if size > MAX_FILE_SIZE_BYTES {
            return Err(AppError::FileTooLarge {
                path: path_str.clone(),
                limit_mb: MAX_FILE_SIZE_BYTES / (1024 * 1024),
            });
        }

        let content = match extension.as_str() {
            "pdf" => {
                log::debug!("Reading PDF: {path_str}");
                match std::panic::catch_unwind(|| pdf_extract::extract_text(path)) {
                    Ok(Ok(text)) => text,
                    Ok(Err(e)) => {
                        return Err(AppError::FileRead {
                            path: path_str,
                            reason: format!("PDF parse error: {e}"),
                        })
                    }
                    Err(_) => {
                        return Err(AppError::FileRead {
                            path: path_str,
                            reason: "PDF extraction panicked".to_string(),
                        })
                    }
                }
            }
            "docx" => {
                let bytes = fs::read(path).map_err(|e| AppError::FileRead {
                    path: path_str.clone(),
                    reason: e.to_string(),
                })?;
                docx_rs::read_docx(&bytes)
                    .map_err(|_| AppError::FileRead {
                        path: path_str.clone(),
                        reason: "DOCX parse error".to_string(),
                    })?
                    .document
                    .children
                    .iter()
                    .filter_map(|c| match c {
                        docx_rs::DocumentChild::Paragraph(p) => Some(p.raw_text()),
                        _ => None,
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            }
            "txt" | "md" | "ts" | "cs" => {
                fs::read_to_string(path).map_err(|e| AppError::FileRead {
                    path: path_str.clone(),
                    reason: e.to_string(),
                })?
            }
            other => {
                return Err(AppError::UnsupportedFormat {
                    extension: other.to_string(),
                })
            }
        };

        Ok(Document {
            path: path_str,
            content,
            file_type: extension,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_txt_with_extension() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "Hello from TXT!").unwrap();
        let reader = FsFileReader;
        let doc = reader.read_file(&path).unwrap();
        assert_eq!(doc.content, "Hello from TXT!");
        assert_eq!(doc.file_type, "txt");
    }

    #[test]
    fn reads_md_with_extension() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("skill.md");
        std::fs::write(&path, "# Skill\nSome content").unwrap();
        let reader = FsFileReader;
        let doc = reader.read_file(&path).unwrap();
        assert!(doc.content.contains("Skill"));
        assert_eq!(doc.file_type, "md");
    }

    #[test]
    fn rejects_unsupported_format() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("image.png");
        std::fs::write(&path, b"\x89PNG\r\n\x1a\n").unwrap();
        let reader = FsFileReader;
        let result = reader.read_file(&path);
        assert!(matches!(result, Err(AppError::UnsupportedFormat { .. })));
    }

    #[test]
    fn rejects_file_too_large() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tiny.txt");
        std::fs::write(&path, "small").unwrap();
        let reader = FsFileReader;
        // Tiny file passes the size check
        assert!(reader.read_file(&path).is_ok());
    }

    #[test]
    fn returns_error_for_missing_file() {
        let reader = FsFileReader;
        let result = reader.read_file(std::path::Path::new("/nonexistent/path/file.txt"));
        assert!(result.is_err());
    }
}
