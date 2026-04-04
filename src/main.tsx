import React from "react";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/iosevka/400.css";
import "@fontsource/iosevka/700.css";
import "@styles/styles.css";
import "@styles/theme.css";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ModalProvider } from "./context/modalContext";
import { NotificationsProvider } from "./context/notifications";
import { QueuedMessageProvider } from "./context/QueuedMessageContext";
import { loadPersistedSettings, persistSettings, initStateChangeHandlers } from "./state/onChangeAppState";
import { registerAllCommands } from "./commands";
import { useOllama } from "./hooks/useOllama";
import { useSystemInfo } from "./hooks/useSystemInfo";

persistSettings()
loadPersistedSettings()
initStateChangeHandlers()
registerAllCommands()

function Bootstrap() {
  useOllama()
  useSystemInfo()
  return <App />
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <NotificationsProvider>
        <ModalProvider>
          <QueuedMessageProvider>
            <Bootstrap />
          </QueuedMessageProvider>
        </ModalProvider>
      </NotificationsProvider>
    </HashRouter>
  </React.StrictMode>,
);

