import React, {memo, useState, useCallback, useRef, useEffect, useLayoutEffect} from "react";
import {InputForAi, InputSelectModel} from "./Input";
import {invoke} from "@tauri-apps/api/core";
import {DisplayResponses} from "@/dashboard";
import {ChatMessage, FormProps} from "@/types/interfaces.ts";
import {listen} from "@tauri-apps/api/event";
import { HourglassIcon, BoltIcon } from "@/assets/icons";

const CHAT_INPUT_MAX_HEIGHT = 192;

const Form = memo(({disabled = false, chatHistory = [], onChatHistoryChange}: FormProps) => {
    const [question, setQuestion] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectModel, setSelectModel] = useState<string>("qwen2.5-coder:3b");

    const isMountedRef = useRef(true);
    const responsesRef = useRef<HTMLElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const unlistenTokenRef = useRef<(() => void) | null>(null);
    const unlistenDoneRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

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

    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "0px";
        const nextHeight = Math.min(textarea.scrollHeight, CHAT_INPUT_MAX_HEIGHT);
        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > CHAT_INPUT_MAX_HEIGHT ? "auto" : "hidden";
    }, [CHAT_INPUT_MAX_HEIGHT]);

    useLayoutEffect(() => {
        adjustTextareaHeight();
    }, [adjustTextareaHeight, question]);

    const handleQuestionChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setQuestion(e.target.value);
        },
        []
    );

    const handleQuestionKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
            return;
        }

        e.preventDefault();

        if (isLoading || disabled) {
            return;
        }

        e.currentTarget.form?.requestSubmit();
    }, [disabled, isLoading]);

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

        const userMsg: ChatMessage = {id: `${Date.now()}`, role: "user", content: trimmed};
        const newHistory = [...chatHistory, userMsg];
        onChatHistoryChange?.(newHistory);

        const aiId = `${Date.now() + 1}`;
        onChatHistoryChange?.([...newHistory, {id: aiId, role: "assistant", content: ""}]);

        const cleanup = () => {
            unlistenTokenRef.current?.();
            unlistenDoneRef.current?.();
            unlistenTokenRef.current = null;
            unlistenDoneRef.current = null;
        };

        unlistenTokenRef.current = await listen<string>("ai_token", (event) => {
            onChatHistoryChange?.(prev => prev.map(msg =>
                msg.id === aiId
                    ? {...msg, content: msg.content + event.payload}
                    : msg
            ));
        });

        unlistenDoneRef.current = await listen<string>("ai_done", async () => {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
            cleanup();
        });

        try {
            await invoke("ask_gerisabet", {question: trimmed, model: selectModel});
        } catch (error: unknown) {
            onChatHistoryChange?.(prev => prev.map(msg =>
                msg.id === aiId
                    ? {...msg, content: "(Error) Failed to get response"}
                    : msg
            ));
            if (isMountedRef.current) {
                setIsLoading(false);
            }
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
                        <InputForAi
                            msg={question}
                            changeEvent={handleQuestionChange}
                            keyDownEvent={handleQuestionKeyDown}
                            textareaRef={textareaRef}
                            disabled={isLoading || disabled}
                        />
                        <button type="submit" disabled={isLoading || disabled} aria-label="Ask question" className="chat-submit-button g-btn g-btn-primary">
                            {disabled ? <><HourglassIcon size="0.9em" /> Indexing...</> : isLoading ? <><BoltIcon size="0.9em" /> Generating...</> : "Ask"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
});

Form.displayName = "Form";

export {Form};

