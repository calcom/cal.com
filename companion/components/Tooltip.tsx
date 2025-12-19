import React, { useState, useRef } from "react";
import { View, Text, Platform, ViewStyle, TextStyle } from "react-native";

interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

// Web-specific style types that extend React Native styles
type WebViewStyle = ViewStyle & {
  position?: "relative" | "fixed" | "absolute" | "static";
  transform?: string;
  pointerEvents?: "none" | "auto";
  boxShadow?: string;
  zIndex?: number;
};

type WebTextStyle = TextStyle & {
  whiteSpace?: "nowrap" | "normal" | "pre" | "pre-wrap" | "pre-line";
};

// Type for web DOM element with getBoundingClientRect
interface WebElement {
  getBoundingClientRect: () => DOMRect;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<View & WebElement>(null);

  if (Platform.OS !== "web") {
    return children;
  }

  const handleMouseEnter = () => {
    if (containerRef.current && containerRef.current.getBoundingClientRect) {
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

  const containerStyle: WebViewStyle = { position: "relative" };

  const tooltipStyle: WebViewStyle = {
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
  };

  const textStyle: WebTextStyle = {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    whiteSpace: "nowrap",
  };

  return (
    <View
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={containerStyle}
    >
      {children}
      {showTooltip && (
        <View style={tooltipStyle}>
          <Text style={textStyle}>{text}</Text>
        </View>
      )}
    </View>
  );
}
