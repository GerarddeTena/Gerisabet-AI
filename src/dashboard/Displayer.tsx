import React, { memo, forwardRef, useMemo, useState, useRef, useEffect } from "react";
import { ChatMessage } from "@types/interfaces.ts";

export interface DisplayResponsesProps {
  history: ChatMessage[];
  isLoading?: boolean;
  className?: string;
}

const LoadingDots = memo(() => (
  <li className="message ai-msg loading-indicator">
    <strong>GerisabetAI:</strong>
    <div className="loading-dots">
      <span />
      <span />
      <span />
    </div>
  </li>
));
LoadingDots.displayName = "LoadingDots";

const Message = memo(({ msg }: { msg: ChatMessage }) => (
  <li className={`message ${msg.role === "user" ? "user-msg" : "ai-msg"}`}>
    <strong>{msg.role === "user" ? "You" : "GerisabetAI"}:</strong>
    <p>{msg.text}</p>
  </li>
));
Message.displayName = "Message";

// Thresholds
const VIRTUALIZE_THRESHOLD = 40; // start virtualizing when history is large
const VIRTUALIZED_COUNT = 300;

function areEqual(prev: DisplayResponsesProps, next: DisplayResponsesProps) {
  if (prev.isLoading !== next.isLoading) return false;
  const prevLen = prev.history.length;
  const nextLen = next.history.length;
  if (prevLen !== nextLen) return false;
  const prevLastId = prev.history[prevLen - 1]?.id ?? null;
  const nextLastId = next.history[nextLen - 1]?.id ?? null;
  return prevLastId === nextLastId;
}

const DisplayResponses = memo(
  forwardRef<HTMLElement, DisplayResponsesProps>(({ history, isLoading = false, className }, forwardedRef) => {
    const { visibleHistory, hiddenCount } = useMemo(() => {
      const total = history.length;
      if (total > VIRTUALIZE_THRESHOLD) {
        const start = Math.max(0, total - VIRTUALIZED_COUNT);
        return { visibleHistory: history.slice(start), hiddenCount: start };
      }
      return { visibleHistory: history, hiddenCount: 0 };
    }, [history]);

    // try to dynamically import react-window; fall back to plain rendering if not available
    const [rw, setRw] = useState<any>(null);
    useEffect(() => {
      let mounted = true;
      import("react-window")
        .then((mod) => {
          if (mounted) setRw(mod);
        })
        .catch(() => {
          // react-window not installed — we'll fallback to list rendering
        });
      return () => {
        mounted = false;
      };
    }, []);

    // refs and measurements
    const innerRef = useRef<HTMLElement | null>(null);
    const setRefs = (el: HTMLElement | null) => {
      innerRef.current = el;
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = el;
    };

    const [containerHeight, setContainerHeight] = useState<number>(300);
    const [containerWidth, setContainerWidth] = useState<number>(600);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const RO = (window as any).ResizeObserver;
      let ro: any;
      if (RO) {
        ro = new RO((entries: any[]) => {
          const rect = entries[0]?.contentRect;
          if (rect) {
            setContainerHeight(Math.max(80, Math.floor(rect.height)));
            setContainerWidth(Math.floor(rect.width));
          }
        });
        ro.observe(el);
      }
      // initial
      const rect = el.getBoundingClientRect();
      setContainerHeight(Math.max(80, Math.floor(rect.height)));
      setContainerWidth(Math.floor(rect.width));

      return () => ro && ro.disconnect();
    }, []);

    // size cache for variable heights
    const sizeCacheRef = useRef<Record<number, number>>({});
    const getItemSize = (index: number) => {
      if (sizeCacheRef.current[index]) return sizeCacheRef.current[index];
      const msg = visibleHistory[index];
      const approxLines = Math.ceil(((msg?.text ?? "").length || 0) / 60);
      const size = Math.min(240, 56 + approxLines * 18);
      sizeCacheRef.current[index] = size;
      return size;
    };

    const listRef = useRef<any>(null);
    useEffect(() => {
      // reset cached sizes when visibleHistory changes
      sizeCacheRef.current = {};
      if (listRef.current?.resetAfterIndex) {
        try {
          listRef.current.resetAfterIndex(0, true);
        } catch {
          /* ignore */
        }
      }
    }, [visibleHistory, rw]);

    const VariableSizeList = rw?.VariableSizeList;

    return (
      <section
        ref={setRefs}
        className={className ?? "container-responses"}
        role="log"
        aria-live="polite"
        aria-atomic="true"
      >
        {hiddenCount > 0 && (
          <div className="indexing-log-entry" aria-hidden="true">
            Showing last {visibleHistory.length} of {history.length} messages
          </div>
        )}

        {VariableSizeList && containerHeight > 0 ? (
          <VariableSizeList
            ref={listRef}
            height={containerHeight}
            width={containerWidth}
            itemCount={visibleHistory.length}
            itemSize={(index: number) => getItemSize(index)}
            overscanCount={6}
            itemKey={(index: number) => visibleHistory[index].id}
          >
            {({ index, style }: { index: number; style: React.CSSProperties }) => (
              <div style={style}>
                <Message msg={visibleHistory[index]} />
              </div>
            )}
          </VariableSizeList>
        ) : (
          <ul className="chat-list">
            {visibleHistory.map((msg) => (
              <Message key={msg.id} msg={msg} />
            ))}

            {isLoading && <LoadingDots />}
          </ul>
        )}
      </section>
    );
  }),
  areEqual
);

DisplayResponses.displayName = "DisplayResponses";

export { DisplayResponses };
