import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import AvailabilityScreen from "../screens/AvailabilityScreen";
import BookingsScreen from "../screens/BookingsScreen";
import EventTypesScreen from "../screens/EventTypesScreen";
import MoreScreen from "../screens/MoreScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Event Types") {
            iconName = focused ? "link" : "link-outline";
          } else if (route.name === "Bookings") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Availability") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "More") {
            iconName = focused ? "ellipsis-vertical" : "ellipsis-vertical-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerStyle: {
          backgroundColor: "#007AFF",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}>
      <Tab.Screen name="Event Types" component={EventTypesScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Availability" component={AvailabilityScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
