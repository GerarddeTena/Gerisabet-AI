
export const InputForAi = ({ msg, changeEvent }: { msg: string, changeEvent: React.ChangeEventHandler<HTMLInputElement> }) => {
  return <input type="text" placeholder="Type your question ..." className="GerisabetInput" value={msg} onChange={changeEvent} />;
}
