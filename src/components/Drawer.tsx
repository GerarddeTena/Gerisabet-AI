import { memo, useCallback, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "@/styles/drawer.css";
import { MenuIcon, HistoryIcon, IndexerIcon, DoctorIcon, ChatIcon, ConversationsIcon } from "@/assets/icons";

const Drawer = memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navigationItems = useMemo(
    () => [
      { to: "/history", label: "History", icon: <HistoryIcon size="1.25rem" /> },
      { to: "/resume", label: "Conversations", icon: <ConversationsIcon size="1.25rem" /> },
      { to: "/indexer", label: "Indexer", icon: <IndexerIcon size="1.25rem" /> },
      { to: "/doctor",  label: "Doctor",  icon: <DoctorIcon  size="1.25rem" /> },
      { to: "/",        label: "Chat",    icon: <ChatIcon    size="1.25rem" /> },
    ],
    [],
  );

  const toggleDrawer = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <aside
      className={`drawer ${isExpanded ? "expanded" : "collapsed"}`}
      aria-label="Application navigation"
    >
      <nav className="drawer-nav">
        <button
          type="button"
          className="drawer-toggle drawer-nav-button"
          onClick={toggleDrawer}
          aria-label={isExpanded ? "Collapse drawer" : "Expand drawer"}
          title={isExpanded ? "Collapse drawer" : "Expand drawer"}
        >
          <span className="drawer-nav-icon"><MenuIcon size="1.25rem" /></span>
          {isExpanded && <span className="drawer-nav-label">Menu</span>}
        </button>

        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `drawer-nav-link drawer-nav-button ${isActive ? "active" : ""}`
            }
            title={item.label}
          >
            <span className="drawer-nav-icon" aria-hidden="true">{item.icon}</span>
            {isExpanded && <span className="drawer-nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
});

Drawer.displayName = "Drawer";

export { Drawer };