import { InputSelectModelProps } from "@types/interfaces.ts";

export const InputForAi = ({
  msg,
  changeEvent,
}: {
  msg: string;
  changeEvent: React.ChangeEventHandler<HTMLInputElement>;
}) => {
  return (
    <input
      type="text"
      placeholder="Type your question ..."
      className="GerisabetInput"
      value={msg}
      onChange={changeEvent}
    />
  );
};

export const InputSelectModel = ({
  model,
  changeEvent,
}: InputSelectModelProps) => {
  return (
    <select
      id="model-select"
      value={model}
      onChange={changeEvent}
      className="model-select"
    >
      <option value="qwen2.5-coder:3b">qwen2.5-coder:3b</option>
      <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
      <option value="llama3.2:3b">llama3.2:3b</option>
      <option value="mistral:7b">mistral:7b</option>
    </select>
  );
};
