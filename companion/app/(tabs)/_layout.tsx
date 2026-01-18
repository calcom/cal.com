import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ColorValue, ImageSourcePropType } from "react-native";
import { Tabs, VectorIcon } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

// Type for vector icon families that support getImageSource
type VectorIconFamily = {
  getImageSource: (name: string, size: number, color: ColorValue) => Promise<ImageSourcePropType>;
};

const SELECTED_COLOR = "#000000";

export default function TabLayout() {
  if (Platform.OS === "web") {
    return <WebTabs />;
  }

  return (
    <NativeTabs
      tintColor={SELECTED_COLOR}
      backgroundColor="#F8F8F8"
      labelStyle={{
        default: { color: "#8E8E93", fontSize: 8.5 },
        selected: { color: SELECTED_COLOR, fontSize: 10 },
      }}
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name="(event-types)">
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="link" />,
          android: (
            <NativeTabs.Trigger.Icon
              src={<VectorIcon family={MaterialCommunityIcons as VectorIconFamily} name="link" />}
              selectedColor={SELECTED_COLOR}
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
              src={
                <VectorIcon family={MaterialCommunityIcons as VectorIconFamily} name="calendar" />
              }
              selectedColor={SELECTED_COLOR}
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
              src={<VectorIcon family={MaterialCommunityIcons as VectorIconFamily} name="clock" />}
              selectedColor={SELECTED_COLOR}
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
              src={
                <VectorIcon
                  family={MaterialCommunityIcons as VectorIconFamily}
                  name="dots-horizontal"
                />
              }
              selectedColor={SELECTED_COLOR}
            />
          ),
        })}
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// TODO: Remove this once native tabs are supported on web
function WebTabs() {
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
