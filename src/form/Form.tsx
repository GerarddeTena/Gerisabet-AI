import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { InputForAi, InputSelectModel } from "./Input";
import { invoke } from "@tauri-apps/api/core";
import { DisplayResponses } from "@/dashboard";
import { ChatMessage } from "@types/interfaces.ts";

export interface FormProps {
    disabled?: boolean;
}

const Form = memo(({disabled = false}: FormProps) => {
    const [question, setQuestion] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [selectModel, setSelectModel] = useState<string>("qwen2.5-coder:3b");

    const isMountedRef = useRef(true);
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const responsesRef = useRef<HTMLElement | null>(null);

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

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const trimmed = question.trim();
            if (!trimmed) return;

            const currentQuestion = trimmed;
            setQuestion("");
            setIsLoading(true);

            const userMsg: ChatMessage = {
                id: Date.now(),
                role: "user",
                text: currentQuestion,
            };

            setChatHistory((prev) => [...prev, userMsg]);

            try {
                const response = await invoke<string>("ask_gerisabet", {
                    question: currentQuestion,
                    model: selectModel,
                });

                if (!isMountedRef.current) return;

                const aiMsg: ChatMessage = {
                    id: Date.now() + 1,
                    role: "ai",
                    text: response ?? "",
                };
                setChatHistory((prev) => [...prev, aiMsg]);
            } catch (error) {
                console.error("ask_gerisabet failed", error);
                if (isMountedRef.current) {
                    const errMsg: ChatMessage = {
                        id: Date.now() + 2,
                        role: "ai",
                        text: "(Error) Failed to get response",
                    };
                    setChatHistory((prev) => [...prev, errMsg]);
                }
            } finally {
                if (isMountedRef.current) setIsLoading(false);
            }
        },
        [question, selectModel]
    );

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
                            {disabled ? "Indexing..." : isLoading ? "Thinking..." : "Ask"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
});

Form.displayName = "Form";

export {Form};
