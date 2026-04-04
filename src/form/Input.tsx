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
                                     models,
                                 }: InputSelectModelProps) => {
    const displayModels =
        models && models.length > 0
            ? models
            : ['qwen2.5-coder:3b', 'llama3.2:3b', 'mistral:7b']

    return (
        <select
            id="model-select"
            value={model}
            onChange={changeEvent}
            className="model-select g-input"
        >
            {displayModels.map((m) => (
                <option key={m} value={m}>{m}</option>
            ))}
        </select>
    );
};

