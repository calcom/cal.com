import React from "react";
import { TouchableOpacity } from "react-native";
import type { TouchableOpacityProps } from "react-native";

type AppPressableProps = TouchableOpacityProps & {
  className?: string;
};

export const AppPressable = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  AppPressableProps
>(({ className, ...props }, ref) => {
  return <TouchableOpacity ref={ref} className={className} {...props} />;
});

AppPressable.displayName = "AppPressable";
