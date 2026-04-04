import {InputSelectModelProps} from "@/types/interfaces.ts";

type InputForAiProps = {
    msg: string;
    changeEvent: React.ChangeEventHandler<HTMLTextAreaElement>;
    keyDownEvent: React.KeyboardEventHandler<HTMLTextAreaElement>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    disabled?: boolean;
};

export const InputForAi = ({
                               msg,
                               changeEvent,
                                keyDownEvent,
                                textareaRef,
                                disabled = false,
                            }: InputForAiProps) => {
    return (
        <textarea
            placeholder="Type your question ..."
            className="GerisabetInput g-input"
            value={msg}
            onChange={changeEvent}
            onKeyDown={keyDownEvent}
            ref={textareaRef}
            rows={1}
            disabled={disabled}
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
            className="model-select g-input"
        >
            <option value="qwen2.5-coder:3b">qwen2.5-coder:3b</option>
            <option value="qwen2.5-coder:7b">qwen2.5-coder:7b</option>
            <option value="llama3.2:3b">llama3.2:3b</option>
            <option value="mistral:7b">mistral:7b</option>
        </select>
    );
};

