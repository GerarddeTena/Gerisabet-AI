import "@styles/styles.css";
import { Form } from "./form/Form";
import { Title } from "@components/Title";
import DatabaseManager from "@components/DatabaseManager";
import {useState} from "react";

export default function App() {
    const [isIndexing, setIsIndexing] = useState<boolean>(false);
  return (
    <div className="app-layout">
      <Title />
      <DatabaseManager onIndexingChange={setIsIndexing} />
      <Form disabled={isIndexing}/>
    </div>
  );
}
