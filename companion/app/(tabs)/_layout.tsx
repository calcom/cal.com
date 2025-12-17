import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  // Check if liquid glass effect is available
  const supportsLiquidGlass = isLiquidGlassAvailable();

  // Use NativeTabs for iOS 15+ (liquid glass support), fallback to standard Tabs
  if (supportsLiquidGlass) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="(event-types)">
          <NativeTabs.Trigger.Icon sf="link" />
          <NativeTabs.Trigger.Label>Event Types</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="bookings">
          <NativeTabs.Trigger.Icon sf="calendar" />
          <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="availability">
          <NativeTabs.Trigger.Icon sf="clock" />
          <NativeTabs.Trigger.Label>Availability</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="more">
          <NativeTabs.Trigger.Icon sf="ellipsis" />
          <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Fallback to standard Expo Router Tabs for older iOS and Android
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0.5,
          borderTopColor: "#C6C6C8",
          paddingBottom: 4,
          paddingTop: 4,
          height: Platform.OS === "android" ? 74 : 66,
        },
      }}
    >
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
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="availability"
        options={{
          title: "Availability",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
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
