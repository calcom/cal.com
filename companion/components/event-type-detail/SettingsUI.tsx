import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { openInAppBrowser } from "@/utils/browser";
import { IOSPickerTrigger } from "./tabs/IOSPickerTrigger";
import { getColors } from "@/constants/colors";

// Section header
export function SectionHeader({
  title,
  rightElement,
}: {
  title: string;
  rightElement?: React.ReactNode;
}) {
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");
  return (
    <View className={`flex-row items-center ${rightElement ? "justify-between pr-4" : ""} mb-2`}>
      <Text
        className="ml-4 text-[13px] uppercase tracking-wide"
        style={{ letterSpacing: 0.5, color: theme.textSecondary }}
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
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");
  return (
    <View>
      {header ? <SectionHeader title={header} rightElement={headerRight} /> : null}
      <View
        className="overflow-hidden rounded-[14px] bg-white"
        style={{ backgroundColor: theme.backgroundSecondary }}
      >
        {children}
      </View>
      {footer ? (
        <Text className="ml-4 mt-2 text-[13px]" style={{ color: theme.textSecondary }}>
          {footer}
        </Text>
      ) : null}
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
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
    <View className="bg-white pl-4" style={{ backgroundColor: theme.backgroundSecondary }}>
      <View
        className={`flex-row items-center pr-4`}
        style={{
          height,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: !isLast ? 1 : 0,
          borderBottomColor: theme.borderSubtle,
        }}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center"
          style={{ height }}
          onPress={description ? showDescription : undefined}
          activeOpacity={description ? 0.7 : 1}
          disabled={!description}
        >
          <Text className="text-[17px]" style={{ fontWeight: "400", color: theme.text }}>
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
            trackColor={{
              false: isDark ? theme.backgroundEmphasis : "#E9E9EA",
              true: isDark ? "#34C759" : "#000000",
            }}
            thumbColor="#FFFFFF"
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
  const colorScheme = useColorScheme();
  const theme = getColors(colorScheme === "dark");
  return (
    <View className="bg-white pl-4" style={{ height, backgroundColor: theme.backgroundSecondary }}>
      <View
        className={`flex-1 flex-row items-center justify-between pr-4`}
        style={{
          height,
          borderBottomWidth: !isLast ? 1 : 0,
          borderBottomColor: theme.borderSubtle,
        }}
      >
        <Text className="text-[17px]" style={{ fontWeight: "400", color: theme.text }}>
          {title}
        </Text>
        <View className="flex-row items-center">
          {Platform.OS === "ios" && options && onSelect ? (
            <>
              {value ? (
                <Text className="mr-2 text-[17px] text-[#A3A3A3]" numberOfLines={1}>
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
                <Text className="mr-1 text-[17px] text-[#A3A3A3]" numberOfLines={1}>
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
