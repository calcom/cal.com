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

  // Only show tooltips on web platform
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
      {showTooltip && (
        <View
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            transform: [{ translateX: -50 }, { translateY: -100 }],
            backgroundColor: "#1a1a1a",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            zIndex: 10002,
            pointerEvents: "none",
            // @ts-ignore - web-only props
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 13,
              fontWeight: "600",
              whiteSpace: "nowrap",
              lineHeight: 18,
            }}
          >
            {text}
          </Text>
        </View>
      )}
    </View>
  );
}
