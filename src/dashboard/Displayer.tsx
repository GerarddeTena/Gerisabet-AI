import React, { memo, useMemo } from "react";
import { ChatMessage, DisplayResponsesProps } from "@/types/interfaces.ts";
import { GerisabetLoader } from "@components/GerisabetLoader.tsx";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const Message = memo(({ msg }: { msg: ChatMessage }) => (
    <li className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
        <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
        <MarkdownRenderer content={msg.content} />
    </li>
));

Message.displayName = "Message";

const VIRTUALIZE_THRESHOLD = 100;

function areEqual(prev: DisplayResponsesProps, next: DisplayResponsesProps) {
    if (prev.isLoading !== next.isLoading) return false;
    if (prev.history.length !== next.history.length) return false;

    const lastPrev = prev.history[prev.history.length - 1];
    const lastNext = next.history[next.history.length - 1];

    if (lastPrev?.id !== lastNext?.id) return false;
    return lastPrev?.content === lastNext?.content;


}

type DisplayResponsesWithRefProps = DisplayResponsesProps & {
    ref?: React.Ref<HTMLElement>;
};

const DisplayResponses = memo(({ history, isLoading = false, className, ref }: DisplayResponsesWithRefProps) => {
    const visibleHistory = useMemo(() => {
        if (history.length > VIRTUALIZE_THRESHOLD) {
            return history.slice(-VIRTUALIZE_THRESHOLD);
        }

        return history;
    }, [history]);

    const hiddenCount = history.length - visibleHistory.length;

    return (
        <section
            ref={ref}
            className={className ?? "container-responses"}
            role="log"
            aria-live="polite"
        >
            {hiddenCount > 0 && (
                <p className="hidden-messages-notice">
                    Showing last {visibleHistory.length} of {history.length} messages
                </p>
            )}
            <ul className="chat-list">
                {visibleHistory.map((msg) => (
                    <Message key={msg.id} msg={msg} />
                ))}
                {isLoading && <GerisabetLoader />}
            </ul>
        </section>
    );
}, areEqual);

DisplayResponses.displayName = "DisplayResponses";

export { DisplayResponses };

