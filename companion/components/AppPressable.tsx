import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import type { GestureResponderEvent, PressableProps, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AppPressableProps = PressableProps & {
  className?: string;
  style?: ViewStyle;
  enableHaptics?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  /** @deprecated Use the built-in animation instead. Kept for backward compatibility. */
  activeOpacity?: number;
};

function usePressAnimations(activeOpacity: number) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatePressIn = useCallback(
    (op: SharedValue<number>, sc: SharedValue<number>) => {
      op.value = withTiming(activeOpacity, { duration: 100 });
      sc.value = withTiming(0.98, { duration: 100 });
    },
    [activeOpacity]
  );

  const animatePressOut = useCallback((op: SharedValue<number>, sc: SharedValue<number>) => {
    op.value = withTiming(1, { duration: 100 });
    sc.value = withTiming(1, { duration: 100 });
  }, []);

  return { animatedStyle, animatePressIn, animatePressOut, opacity, scale };
}

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
    const { animatedStyle, animatePressIn, animatePressOut, opacity, scale } =
      usePressAnimations(activeOpacity);

    const handlePressIn = useCallback(
      (event: GestureResponderEvent) => {
        animatePressIn(opacity, scale);
        onPressIn?.(event);
      },
      [animatePressIn, onPressIn, opacity, scale]
    );

    const handlePressOut = useCallback(
      (event: GestureResponderEvent) => {
        animatePressOut(opacity, scale);
        onPressOut?.(event);
      },
      [animatePressOut, onPressOut, opacity, scale]
    );

    const handlePress = useCallback(
      (event: GestureResponderEvent) => {
        if (enableHaptics) {
          Haptics.impactAsync(hapticStyle);
        }
        onPress?.(event);
      },
      [enableHaptics, hapticStyle, onPress]
    );

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
