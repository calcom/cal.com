import React from "react";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  showBackground?: boolean;
}

export function LoadingSpinner({
  size = "large",
  color,
  showBackground = true,
}: LoadingSpinnerProps) {
  const supportsGlass = isLiquidGlassAvailable();

  if (supportsGlass && Platform.OS === "ios") {
    return (
      <GlassView style={styles.glassContainer} glassEffectStyle="regular">
        <ActivityIndicator size={size} color={color || "#000000"} />
      </GlassView>
    );
  }

  if (showBackground) {
    return (
      <View style={styles.styledContainer}>
        <ActivityIndicator size={size} color={color || "#000000"} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={color || "#000000"} />;
}

const styles = StyleSheet.create({
  glassContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 20,
  },
  styledContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
});

export default LoadingSpinner;
