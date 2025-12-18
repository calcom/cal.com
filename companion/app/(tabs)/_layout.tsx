import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, VectorIcon } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  if (Platform.OS === "web") {
    return <WebTabs />;
  }

  return (
    <NativeTabs
      disableTransparentOnScrollEdge={true} // Used to prevent transparent background on iOS 18 and older
    >
      <NativeTabs.Trigger name="(event-types)">
        <NativeTabs.Trigger.Icon
          sf="link"
          src={<VectorIcon family={MaterialCommunityIcons} name="link" />}
        />
        <NativeTabs.Trigger.Label>Event Types</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bookings">
        <NativeTabs.Trigger.Icon
          sf="calendar"
          src={<VectorIcon family={MaterialCommunityIcons} name="calendar" />}
        />
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(availability)">
        <NativeTabs.Trigger.Icon
          sf="clock"
          src={<VectorIcon family={MaterialCommunityIcons} name="clock" />}
        />
        <NativeTabs.Trigger.Label>Availability</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon
          sf="ellipsis"
          src={<VectorIcon family={MaterialCommunityIcons} name="dots-horizontal" />}
        />
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
