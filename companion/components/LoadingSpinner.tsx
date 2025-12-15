/**
 * LoadingSpinner Component
 *
 * A stylish loading spinner with iOS glass effect support when available.
 * Falls back to a nice styled container on other platforms.
 */

import React from "react";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

interface LoadingSpinnerProps {
  /** Size of the spinner - defaults to large */
  size?: "small" | "large";
  /** Color of the spinner - defaults to system color */
  color?: string;
  /** Whether to show the container background */
  showBackground?: boolean;
}

export function LoadingSpinner({
  size = "large",
  color,
  showBackground = true,
}: LoadingSpinnerProps) {
  const supportsGlass = isLiquidGlassAvailable();

  // Use glass effect on supported iOS devices
  if (supportsGlass && Platform.OS === "ios") {
    return (
      <GlassView style={styles.glassContainer} glassEffectStyle="regular">
        <ActivityIndicator size={size} color={color || "#000000"} />
      </GlassView>
    );
  }

  // Styled container for other platforms
  if (showBackground) {
    return (
      <View style={styles.styledContainer}>
        <ActivityIndicator size={size} color={color || "#000000"} />
      </View>
    );
  }

  // Simple spinner without background
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default LoadingSpinner;
