import { AppPressable } from "./AppPressable";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GlassModalHeaderProps {
  title: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  /** Use icon button style (like three-dot menu) instead of text */
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

export function GlassModalHeader({
  title,
  onClose,
  onAction,
  actionLabel = "Done",
  actionDisabled = false,
  actionLoading = false,
  actionIcon,
}: GlassModalHeaderProps) {
  const insets = useSafeAreaInsets();

  const isDisabled = actionDisabled || actionLoading;

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#FFFFFF",
      }}
    >
      <View className="min-h-[44px] flex-row items-center justify-between px-4">
        {/* Back Button - matching native iOS style */}
        <AppPressable
          className="h-11 w-11 items-center justify-center"
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </AppPressable>

        {/* Title - centered */}
        <Text className="flex-1 text-center text-[17px] font-semibold text-black" numberOfLines={1}>
          {title}
        </Text>

        {/* Action Button - matching senior's Stack.Header.Menu style */}
        {onAction ? (
          <AppPressable
            className={`h-11 min-w-[44px] items-center justify-center rounded-full ${
              actionIcon ? "bg-[#F2F2F7]" : ""
            } ${isDisabled ? "opacity-40" : ""}`}
            onPress={onAction}
            disabled={isDisabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={actionIcon ? { width: 44, height: 44 } : undefined}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : actionIcon ? (
              // Icon button style (like the three-dot menu)
              <Ionicons name={actionIcon} size={22} color="#000" />
            ) : (
              // Text button style (like "Save", "Done")
              <View className="items-center rounded-full bg-black px-4 py-2">
                <Text className="text-[15px] font-semibold text-white">{actionLabel}</Text>
              </View>
            )}
          </AppPressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
    </View>
  );
}
