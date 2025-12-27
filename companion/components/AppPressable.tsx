import * as Haptics from "expo-haptics";
import React from "react";
import type { PressableProps, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AppPressableProps = PressableProps & {
  className?: string;
  style?: ViewStyle;
  enableHaptics?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  /** @deprecated Use the built-in animation instead. Kept for backward compatibility. */
  activeOpacity?: number;
};

export const AppPressable = React.forwardRef<React.ElementRef<typeof Pressable>, AppPressableProps>(
  (
    {
      className,
      style,
      enableHaptics = true,
      hapticStyle = Haptics.ImpactFeedbackStyle.Light,
      activeOpacity = 0.7,
      onPressIn,
      onPressOut,
      onPress,
      ...props
    },
    ref
  ) => {
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn: PressableProps["onPressIn"] = (event) => {
      opacity.value = withTiming(activeOpacity, { duration: 100 });
      scale.value = withTiming(0.98, { duration: 100 });
      onPressIn?.(event);
    };

    const handlePressOut: PressableProps["onPressOut"] = (event) => {
      opacity.value = withTiming(1, { duration: 100 });
      scale.value = withTiming(1, { duration: 100 });
      onPressOut?.(event);
    };

    const handlePress: PressableProps["onPress"] = (event) => {
      if (enableHaptics) {
        Haptics.impactAsync(hapticStyle);
      }
      onPress?.(event);
    };

    return (
      <AnimatedPressable
        ref={ref}
        className={className}
        style={[style, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        {...props}
      />
    );
  }
);

AppPressable.displayName = "AppPressable";
