import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, Switch, Text, TouchableOpacity, View } from "react-native";
import { openInAppBrowser } from "@/utils/browser";
import { IOSPickerTrigger } from "./tabs/IOSPickerTrigger";

// Section header
export function SectionHeader({
  title,
  rightElement,
}: {
  title: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <View className={`flex-row items-center ${rightElement ? "justify-between pr-4" : ""} mb-2`}>
      <Text
        className="ml-4 text-[13px] uppercase tracking-wide text-[#6D6D72]"
        style={{ letterSpacing: 0.5 }}
      >
        {title}
      </Text>
      {rightElement}
    </View>
  );
}

// Settings group container
export function SettingsGroup({
  children,
  header,
  headerRight,
  footer,
}: {
  children: React.ReactNode;
  header?: string;
  headerRight?: React.ReactNode;
  footer?: string;
}) {
  return (
    <View>
      {header ? <SectionHeader title={header} rightElement={headerRight} /> : null}
      <View className="overflow-hidden rounded-[14px] bg-white">{children}</View>
      {footer ? <Text className="ml-4 mt-2 text-[13px] text-[#6D6D72]">{footer}</Text> : null}
    </View>
  );
}

// Toggle row with indented separator
export function SettingRow({
  title,
  description,
  value,
  onValueChange,
  learnMoreUrl,
  isFirst = false,
  isLast = false,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  learnMoreUrl?: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const height = isFirst || isLast ? 52 : 44;
  const showDescription = () => {
    if (!description) return;

    const buttons: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "default" | "destructive";
    }[] = [{ text: "OK", style: "cancel" }];

    if (learnMoreUrl) {
      buttons.unshift({
        text: "Learn more",
        onPress: () => openInAppBrowser(learnMoreUrl, "Learn more"),
      });
    }

    Alert.alert(title, description, buttons);
  };

  return (
    <View className="bg-white pl-4">
      <View
        className={`flex-row items-center pr-4 ${!isLast ? "border-b border-[#E5E5E5]" : ""}`}
        style={{ height, flexDirection: "row", alignItems: "center" }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center"
          style={{ height }}
          onPress={description ? showDescription : undefined}
          activeOpacity={description ? 0.7 : 1}
          disabled={!description}
        >
          <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
            {title}
          </Text>
          {description ? (
            <Ionicons name="chevron-down" size={12} color="#C7C7CC" style={{ marginLeft: 6 }} />
          ) : null}
        </TouchableOpacity>
        <View style={{ alignSelf: "center", justifyContent: "center" }}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: "#E9E9EA", true: "#000000" }}
            thumbColor={Platform.OS !== "ios" ? "#FFFFFF" : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// Navigation row (with chevron)
export function NavigationRow({
  title,
  value,
  onPress,
  isFirst = false,
  isLast = false,
  options,
  onSelect,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  options?: { label: string; value: string }[];
  onSelect?: (value: string) => void;
}) {
  const height = isFirst || isLast ? 52 : 44;
  return (
    <View className="bg-white pl-4" style={{ height }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4 ${
          !isLast ? "border-b border-[#E5E5E5]" : ""
        }`}
        style={{ height }}
      >
        <Text className="text-[17px] text-black" style={{ fontWeight: "400" }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" && options && onSelect ? (
            <>
              {value ? (
                <Text className="mr-2 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <IOSPickerTrigger options={options} selectedValue={value || ""} onSelect={onSelect} />
            </>
          ) : (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={onPress}
              activeOpacity={0.5}
            >
              {value ? (
                <Text className="mr-1 text-[17px] text-[#8E8E93]" numberOfLines={1}>
                  {value}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
