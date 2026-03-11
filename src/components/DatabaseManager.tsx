import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export default function DatabaseManager() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const injectContext = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
        title: "Selecciona la carpeta con los PDFs",
      });

      if (!selectedPath) {
        setStatusMessage("Selección cancelada.");
        return;
      }

      setIsIndexing(true);
      setStatusMessage(`Indexando archivos de: ${selectedPath}...`);

      const response = await invoke<string>("index_library", {
        directoryPath: selectedPath,
      });

      setStatusMessage(`¡Éxito! ${response}`);
    } catch (error) {
      console.error("Error en Rust:", error);
      setStatusMessage(`Error: ${error}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const statusClass = statusMessage.startsWith("¡")
    ? "status-message success"
    : statusMessage.startsWith("Error")
    ? "status-message error"
    : "status-message";

  return (
    <div className="db-manager">
      <h2>Base de Conocimientos</h2>
      <p>
        Selecciona una carpeta en tu equipo para inyectar su contenido a
        Gerisabet AI.
      </p>
      <button
        onClick={injectContext}
        disabled={isIndexing}
        className="btn-inject"
      >
        {isIndexing ? "Procesando y vectorizando..." : "Inyectar Contexto"}
      </button>

      {statusMessage && (
        <div className={statusClass}>
          <strong>Estado:</strong> {statusMessage}
        </div>
      )}
    </div>
  );
}
