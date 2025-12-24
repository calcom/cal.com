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
}

export function GlassModalHeader({
  title,
  onClose,
  onAction,
  actionLabel = "Done",
  actionDisabled = false,
  actionLoading = false,
}: GlassModalHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 0.5,
        borderBottomColor: "#E5E5EA",
      }}
    >
      <View className="min-h-[44px] flex-row items-center justify-between px-4">
        {/* Back Button */}
        <AppPressable
          className="h-10 w-10 items-start justify-center"
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </AppPressable>

        {/* Title */}
        <Text
          className="mx-2.5 flex-1 text-center text-[17px] font-semibold text-black"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Action Button or Spacer */}
        {onAction ? (
          <AppPressable
            className={`min-w-[60px] items-center rounded-[10px] bg-black px-3 py-2 ${
              actionDisabled || actionLoading ? "opacity-40" : ""
            }`}
            onPress={onAction}
            disabled={actionDisabled || actionLoading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">{actionLabel}</Text>
            )}
          </AppPressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
    </View>
  );
}
