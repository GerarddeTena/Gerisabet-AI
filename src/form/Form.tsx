import "@styles/styles.css";
import { memo, useState } from "react";
import { InputForAi, InputSelectModel } from "./Input";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage, DisplayResponses } from "../dashboard/Displayer";

const Form = memo(() => {
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectModel, setSelectModel] = useState<string>("qwen2.5-coder:3b");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: currentQuestion,
    };
    setChatHistory((prev) => [...prev, userMsg]);

    try {
      const response = await invoke<string>("ask_gerisabet", {
        question: currentQuestion,
        model: selectModel,
      });
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "ai",
        text: response,
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="model-bar">
        <label htmlFor="model-select">Model:</label>
        <InputSelectModel
          model={selectModel}
          changeEvent={(e) => setSelectModel(e.target.value)}
        />
      </div>

      <DisplayResponses history={chatHistory} isLoading={isLoading} />

      <div className="chat-form-area">
        <form onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <InputForAi
              msg={question}
              changeEvent={(e) => setQuestion(e.target.value)}
            />
            <button
              type="submit"
              className="question-button"
              disabled={isLoading}
            >
              {isLoading ? "..." : "Ask"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
});

export { Form };
