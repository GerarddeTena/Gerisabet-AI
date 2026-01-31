import { memo } from "react";
export interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

const DisplayResponses = memo(({ history }: { history: ChatMessage[] }) => {
  return (
    <section className="container-responses">
      <ul className="chat-list">
        {history.map((msg) => (
          <li
            key={msg.id}
            className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}
          >
            <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
});

export { DisplayResponses };
