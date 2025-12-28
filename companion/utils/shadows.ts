import { Platform, type ViewStyle } from "react-native";

interface ShadowConfig {
  color?: string;
  offsetY?: number;
  offsetX?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}

export function createShadow(config: ShadowConfig = {}): ViewStyle {
  const {
    color = "#000",
    offsetX = 0,
    offsetY = 2,
    opacity = 0.1,
    radius = 8,
    elevation = 4,
  } = config;

  if (Platform.OS === "web") {
    const _alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const shadows = {
  sm: () => createShadow({ offsetY: 1, radius: 3, opacity: 0.1, elevation: 2 }),
  md: () => createShadow({ offsetY: 4, radius: 6, opacity: 0.1, elevation: 4 }),
  lg: () => createShadow({ offsetY: 10, radius: 15, opacity: 0.15, elevation: 8 }),
  xl: () => createShadow({ offsetY: 20, radius: 25, opacity: 0.25, elevation: 24 }),
  none: (): ViewStyle => ({}),
};
