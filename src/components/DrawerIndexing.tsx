import { memo } from "react";
import DrawerIndexDatabase from "./DrawerIndexDatabase";
import DrawerIndexSkills from "./DrawerIndexSkills";

interface DrawerIndexingProps {
  isIndexing: boolean;
  onIndexingChange: (state: boolean) => void;
}

const DrawerIndexing = memo(({onIndexingChange }: DrawerIndexingProps) => {
  return (
    <>
      <DrawerIndexDatabase onIndexingChange={onIndexingChange} />
      <DrawerIndexSkills onIndexingChange={onIndexingChange} />
    </>
  );
});

DrawerIndexing.displayName = "DrawerIndexing";

export default DrawerIndexing;
