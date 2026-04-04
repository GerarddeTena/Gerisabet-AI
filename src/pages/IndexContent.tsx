import { memo } from "react";
import { DatabaseManager, SkillsManager } from "@/components";

interface IndexContentPageProps {
  onIndexingChange: (state: boolean) => void;
}

const IndexContentPage = memo(({ onIndexingChange }: IndexContentPageProps) => {
  return (
	<div className="page-stack">
	  <section className="page-intro g-card">
		<h2>Indexer</h2>
		<p>Manage both the document library and Markdown skills sources from a dedicated routed view.</p>
	  </section>

	  <DatabaseManager onIndexingChange={onIndexingChange} />
	  <SkillsManager onIndexingChange={onIndexingChange} />
	</div>
  );
});

IndexContentPage.displayName = "IndexContentPage";

export default IndexContentPage;


