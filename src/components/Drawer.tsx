import { memo, useState, useCallback } from "react";
import DrawerIndexing from "./DrawerIndexing";
import DrawerChatHistory from "./DrawerChatHistory";
import { ChatMessage } from "@/types/interfaces";
import "@/styles/drawer.css";

interface DrawerProps {
  isIndexing: boolean;
  onIndexingChange: (state: boolean) => void;
  chatHistory: ChatMessage[];
  onClearHistory: () => void;
  onExportHistory: () => void;
}

const Drawer = memo(({
  isIndexing,
  onIndexingChange,
  chatHistory,
  onClearHistory,
  onExportHistory,
}: DrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"indexing" | "history">("indexing");

  const toggleDrawer = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Drawer Toggle Button */}
      <button
        className="drawer-toggle"
        onClick={toggleDrawer}
        aria-label="Toggle drawer menu"
        title="Open settings drawer"
      >
        <span className="drawer-icon">☰</span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="drawer-overlay" onClick={closeDrawer} />
      )}

      {/* Drawer Container */}
      <aside className={`drawer ${isOpen ? "open" : ""}`}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <h2>Settings</h2>
          <button
            className="drawer-close"
            onClick={closeDrawer}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeTab === "indexing" ? "active" : ""}`}
            onClick={() => setActiveTab("indexing")}
          >
            Indexing
          </button>
          <button
            className={`drawer-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content">
          {activeTab === "indexing" && (
            <DrawerIndexing
              isIndexing={isIndexing}
              onIndexingChange={onIndexingChange}
            />
          )}
          {activeTab === "history" && (
            <DrawerChatHistory
              chatHistory={chatHistory}
              onClearHistory={onClearHistory}
              onExportHistory={onExportHistory}
            />
          )}
        </div>
      </aside>
    </>
  );
});

Drawer.displayName = "Drawer";

export { Drawer };
