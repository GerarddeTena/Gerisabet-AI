import React, {memo, useState, useCallback, useRef, useEffect} from "react";
import {InputForAi, InputSelectModel} from "./Input";
import {invoke} from "@tauri-apps/api/core";
import {DisplayResponses} from "@/dashboard";
import {ChatMessage, FormProps} from "@/types/interfaces.ts";
import {listen} from "@tauri-apps/api/event";

const Form = memo(({disabled = false, chatHistory = [], onChatHistoryChange}: FormProps) => {
    const [question, setQuestion] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectModel, setSelectModel] = useState<string>("qwen2.5-coder:3b");

    const responsesRef = useRef<HTMLElement | null>(null);
    const unlistenTokenRef = useRef<(() => void) | null>(null);
    const unlistenDoneRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const el = responsesRef.current;
        if (!el) return;
        requestAnimationFrame(() => {
            try {
                (el as any).scrollTo({top: el.scrollHeight, behavior: "smooth"});
            } catch {
                el.scrollTop = el.scrollHeight;
            }
        });
    }, [chatHistory, isLoading]);

    const handleQuestionChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setQuestion(e.target.value);
        },
        []
    );

    const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectModel(e.target.value);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = question.trim();
        if (!trimmed) return;

        unlistenTokenRef.current?.();
        unlistenDoneRef.current?.();

        setQuestion("");
        setIsLoading(true);

        const userMsg: ChatMessage = {id: Date.now(), role: "user", text: trimmed};
        const newHistory = [...chatHistory, userMsg];
        onChatHistoryChange?.(newHistory);

        const aiId = Date.now() + 1;
        onChatHistoryChange?.([...newHistory, {id: aiId, role: "ai", text: ""}]);

        const cleanup = () => {
            unlistenTokenRef.current?.();
            unlistenDoneRef.current?.();
            unlistenTokenRef.current = null;
            unlistenDoneRef.current = null;
        };

        unlistenTokenRef.current = await listen<string>("ai_token", (event) => {
            onChatHistoryChange?.(prev => prev.map(msg =>
                msg.id === aiId
                    ? {...msg, text: msg.text + event.payload}
                    : msg
            ));
        });

        unlistenDoneRef.current = await listen<string>("ai_done", async (event) => {
            setIsLoading(false);

            const fullResponse = event.payload;
            if (fullResponse) {
                await invoke("save_exchange", {
                    question: trimmed,
                    answer: fullResponse
                });
            }

            cleanup();
        });

        try {
            await invoke("ask_gerisabet", {question: trimmed, model: selectModel});
        } catch (error) {
            onChatHistoryChange?.(prev => prev.map(msg =>
                msg.id === aiId
                    ? {...msg, text: "(Error) Failed to get response"}
                    : msg
            ));
            setIsLoading(false);
            cleanup();
        }
    }, [question, selectModel, chatHistory, onChatHistoryChange]);

    return (
        <>
            <div className="model-bar">
                <label htmlFor="model-select">Model:</label>
                <InputSelectModel model={selectModel} changeEvent={handleModelChange}/>
            </div>

            <DisplayResponses ref={responsesRef} history={chatHistory} isLoading={isLoading}/>

            <div className="chat-form-area">
                <form onSubmit={handleSubmit}>
                    <div className="chat-input-row">
                        <InputForAi msg={question} changeEvent={handleQuestionChange}/>
                        <button type="submit" disabled={isLoading || disabled} aria-label="Ask question">
                            {disabled ? "⏳ Indexing..." : isLoading ? "⚡ Generating..." : "Ask"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
});

Form.displayName = "Form";

export {Form};
