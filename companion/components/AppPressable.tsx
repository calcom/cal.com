import React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

export interface AppPressableProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  className?: string;
}

/**
 * AppPressable - A unified pressable component that replaces TouchableOpacity.
 *
 * Benefits over TouchableOpacity:
 * - More flexible and future-proof
 * - Better support for newer interaction patterns
 * - Consistent pressed state styling via opacity
 * - Foundation for adding haptics and animations later (e.g., pressto package)
 *
 * Usage:
 * <AppPressable onPress={handlePress} activeOpacity={0.7}>
 *   <Text>Press me</Text>
 * </AppPressable>
 */
export function AppPressable({
  children,
  style,
  activeOpacity = 0.7,
  disabled,
  ...props
}: AppPressableProps) {
  return (
    <Pressable
      style={({ pressed }) => [style, pressed && !disabled && { opacity: activeOpacity }]}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}
