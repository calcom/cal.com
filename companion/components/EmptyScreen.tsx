import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    text: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#A3A3A3" : "#6B7280",
    iconBackground: isDark ? "#2C2C2E" : "#F3F4F6",
    icon: isDark ? "#E5E5EA" : "#374151",
    buttonBg: isDark ? "#FFFFFF" : "#111827",
    buttonText: isDark ? "#000000" : "#FFFFFF",
  };

  return (
    <View
      style={{
        borderRadius: 8,
        padding: 28,
        width: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      className={className}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.iconBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={40} color={colors.icon} />
      </View>

      <View className="mt-6 max-w-[420px] flex-col items-center">
        <Text style={{ color: colors.text }} className="text-center text-2xl font-semibold">
          {headline}
        </Text>

        <Text
          style={{ color: colors.textSecondary }}
          className="mb-8 mt-3 text-center text-sm font-normal leading-6"
        >
          {description}
        </Text>

        {buttonText && onButtonPress ? (
          <TouchableOpacity
            style={{ backgroundColor: colors.buttonBg }}
            className="flex-row items-center justify-center gap-1 rounded-lg px-4 py-2.5"
            onPress={onButtonPress}
          >
            <Text style={{ color: colors.buttonText }} className="text-base font-medium">
              {buttonText}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
