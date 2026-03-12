import { memo, useRef, useCallback } from "react";

const Title = memo(() => {
  const ref = useRef<HTMLHeadingElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLHeadingElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--mx", `${x.toFixed(1)}%`);
    el.style.setProperty("--my", `${y.toFixed(1)}%`);
  }, []);

  return (
    <h1
      ref={ref}
      className="app-title"
      onMouseMove={handleMouseMove}
    >
      GerisabetAI
    </h1>
  );
});

Title.displayName = "Title";
export { Title };
