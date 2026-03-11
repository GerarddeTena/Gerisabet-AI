import "@styles/styles.css";
import { memo } from "react";

export interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

const LoadingDots = () => (
  <li className="message ai-msg loading-indicator">
    <strong>GerisabetAI:</strong>
    <div className="loading-dots">
      <span />
      <span />
      <span />
    </div>
  </li>
);

const DisplayResponses = memo(
  ({ history, isLoading }: { history: ChatMessage[]; isLoading?: boolean }) => {
    return (
      <section className="container-responses">
        <ul className="chat-list">
          {history.map((msg) => (
            <li
              key={msg.id}
              className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}
            >
              <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
              <p>{msg.text}</p>
            </li>
          ))}
          {isLoading && <LoadingDots />}
        </ul>
      </section>
    );
  }
);

export { DisplayResponses };
