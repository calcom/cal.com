import React, { useState, useRef, useEffect } from "react";
import { View, Text, Platform } from "react-native";

interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<any>(null);

  if (Platform.OS !== "web") {
    return children;
  }

  const handleMouseEnter = (e: any) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2 + 20,
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <View
      ref={containerRef}
      // @ts-ignore - web-only props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: "relative" }}
    >
      {children}
      {showTooltip ? (
        <View
          // @ts-ignore - web-only styles
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: "translate(-50%, -100%)",
            backgroundColor: "#1a1a1a",
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: 6,
            zIndex: 10002,
            pointerEvents: "none",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* @ts-ignore - web-only styles */}
          <Text style={{ color: "white", fontSize: 13, fontWeight: "600", whiteSpace: "nowrap" }}>
            {text}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
