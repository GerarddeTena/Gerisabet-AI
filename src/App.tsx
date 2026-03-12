import { useState } from "react";
import { Form } from "./form";
import { Title, DatabaseManager, SkillsManager } from "@components/index";

export default function App() {
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  return (
    <div className="app-layout">
      <Title />
      <DatabaseManager onIndexingChange={setIsIndexing} />
      <SkillsManager onIndexingChange={setIsIndexing} />
      <Form disabled={isIndexing} />
    </div>
  );
}
