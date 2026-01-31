import { memo, useState } from "react";
import { InputForAi } from "./Input";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "../dashboard/Displayer";
import ChatHistory from "../dashboard/History";

const Form = memo(() => {

  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion(""); // Limpiamos input inmediatamente para mejor UX
    setIsLoading(true);

    // 1. Añadimos la pregunta del usuario al store visualmente YA
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: currentQuestion
    };
    setChatHistory(prev => [...prev, userMsg]);

    try {
      // 2. Llamada al Backend (Rust)
      const response = await invoke<string>("ask_gerisabet", { question: currentQuestion });

      // 3. Añadimos la respuesta de la IA al store
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: response
      };
      setChatHistory(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div>
        <ChatHistory chatHistory={chatHistory} />
      </div>
      <div>
        <form onSubmit={handleSubmit}>
          <InputForAi msg={question} changeEvent={(e) => setQuestion(e.target.value)} />
          <button type="submit" className="question-button">{isLoading ? "Thinking..." : "Ask"}</button>
        </form>
      </div>
    </>
  )
});

export { Form };
