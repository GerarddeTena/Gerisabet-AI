import { memo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Drawer, Title } from "@/components";

const Layout = memo(() => {
  const location = useLocation();
  const isChatView = location.pathname === "/";

  return (
	<div className="app-shell">
	  <Drawer />

	  <div className="app-content">
		<Link to="/" className="title-link" aria-label="Go to chat view">
		  <Title />
		</Link>

		<main className={`app-view ${isChatView ? "chat-view" : "page-view"}`}>
		  <Outlet />
		</main>
	  </div>
	</div>
  );
});

Layout.displayName = "Layout";

export default Layout;


