import "@styles/styles.css";
import { Form } from "./form/Form";
import { Title } from "@components/Title";
import DatabaseManager from "@components/DatabaseManager";

export default function App() {
  return (
    <div className="app-layout">
      <Title />
      <DatabaseManager />
      <Form />
    </div>
  );
}
