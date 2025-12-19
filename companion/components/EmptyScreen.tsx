import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface EmptyScreenProps {
  icon: IoniconName;
  headline: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
  className?: string;
}

export function EmptyScreen({
  icon,
  headline,
  description,
  buttonText,
  onButtonPress,
  className,
}: EmptyScreenProps) {
  return (
    <View
      className={`flex w-full select-none flex-col items-center justify-center rounded-lg border border-gray-300 bg-white p-7 ${className || ""}`}
    >
      <View className="h-[72px] w-[72px] items-center justify-center rounded-full border border-gray-300 bg-gray-100">
        <Ionicons name={icon} size={40} color="#374151" />
      </View>

      <View className="mt-6 max-w-[420px] flex-col items-center">
        <Text className="text-center text-2xl font-semibold text-gray-900">{headline}</Text>

        <Text className="mb-8 mt-3 text-center text-sm font-normal leading-6 text-gray-500">
          {description}
        </Text>

        {buttonText && onButtonPress ? (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2.5"
            onPress={onButtonPress}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-base font-medium text-white">{buttonText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
