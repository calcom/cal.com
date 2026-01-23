import type React from "react";
import { useState } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tooltip wrapper only shows/hides content on hover, not a clickable element
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {showTooltip ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "100%",
            transform: "translate(-50%, -8px)",
            backgroundColor: "#1a1a1a",
            padding: "6px 10px",
            borderRadius: 6,
            zIndex: 10002,
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
