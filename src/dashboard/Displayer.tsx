import React, { memo, forwardRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChatMessage, DisplayResponsesProps } from "@/types/interfaces.ts";
import { GerisabetLoader } from "@components/GerisabetLoader.tsx";

const Message = memo(({ msg }: { msg: ChatMessage }) => (
    <li className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
        <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
        {msg.role === "user" ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
        ) : (
            <div className="md-response">
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>{children}</code>
                            );
                        },
                    }}
                >
                    {msg.text}
                </ReactMarkdown>
            </div>
        )}
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
    return lastPrev?.text === lastNext?.text;


}

const DisplayResponses = memo(
    forwardRef<HTMLElement, DisplayResponsesProps>((props, ref) => {
        const { history, isLoading = false, className } = props;
        const visibleHistory = useMemo(() => {
            if (history.length > VIRTUALIZE_THRESHOLD) {
                return history.slice(-VIRTUALIZE_THRESHOLD);
            }
            return history;
        }, [history]);

        const hiddenCount = history.length - visibleHistory.length;

        return (
            <section
                ref={ref as React.Ref<HTMLElement>}
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
    }),
    areEqual
);

DisplayResponses.displayName = "DisplayResponses";

export { DisplayResponses };
