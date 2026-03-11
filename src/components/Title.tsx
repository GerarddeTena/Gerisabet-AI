import { memo } from "react";

const Title = memo(() => {
  return (
    <h1 className="app-title">GerisabetAI</h1>
  );
});

Title.displayName = "Title";
export { Title };
