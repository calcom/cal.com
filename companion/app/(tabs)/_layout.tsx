import { Ionicons } from "@expo/vector-icons";
import type { ColorValue, ImageSourcePropType } from "react-native";
import { Tabs, VectorIcon } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";
import { Platform } from "react-native";

// Type for vector icon families that support getImageSource
type VectorIconFamily = {
  getImageSource: (name: string, size: number, color: ColorValue) => Promise<ImageSourcePropType>;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    selected: isDark ? "#FFFFFF" : "#000000",
    inactive: "#A3A3A3",
    background: isDark ? "#000000" : "#FFFFFF",
    border: isDark ? "#4D4D4D" : "#C6C6C8",
    indicator: isDark ? "#FFFFFF15" : "#00000015",
  };

  if (Platform.OS === "web") {
    return <WebTabs colors={colors} />;
  }

  return (
    <NativeTabs
      tintColor={colors.selected}
      iconColor={Platform.select({ android: colors.inactive, ios: undefined })}
      indicatorColor={Platform.select({ android: colors.indicator, ios: undefined })}
      backgroundColor={Platform.select({ android: colors.background, ios: undefined })}
      labelStyle={{
        default: { color: colors.inactive, fontSize: Platform.select({ android: 11, ios: 8.5 }) },
        selected: { color: colors.selected, fontSize: Platform.select({ android: 12, ios: 10 }) },
      }}
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name="(event-types)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="link" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={<VectorIcon family={Ionicons as VectorIconFamily} name="link-outline" />}
              selectedColor={colors.selected}
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Event Types</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(bookings)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="calendar" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={<VectorIcon family={Ionicons as VectorIconFamily} name="calendar-outline" />}
              selectedColor={colors.selected}
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(availability)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} />,
          android: (
            <NativeTabs.Trigger.Icon
              src={<VectorIcon family={Ionicons as VectorIconFamily} name="time-outline" />}
              selectedColor={colors.selected}
            />
          ),
        })}
        <NativeTabs.Trigger.Label>Availability</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(more)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf={{ default: "ellipsis", selected: "ellipsis" }} />,
          android: (
            <NativeTabs.Trigger.Icon
              src={<VectorIcon family={Ionicons as VectorIconFamily} name="ellipsis-horizontal" />}
              selectedColor={colors.selected}
            />
          ),
        })}
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

type TabColors = {
  selected: string;
  inactive: string;
  background: string;
  border: string;
  indicator: string;
};

// TODO: Remove this once native tabs are supported on web
function WebTabs({ colors }: { colors: TabColors }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.selected,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: 4,
          paddingTop: 4,
          height: Platform.OS === "android" ? 74 : 66,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="(event-types)"
        options={{
          title: "Event Types",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "link" : "link-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(bookings)"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(availability)"
        options={{
          title: "Availability",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(more)"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
