import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  // Check iOS version for liquid glass support (iOS 15+)
  const supportsLiquidGlass = Platform.OS === 'ios' && 
    Device.osVersion && 
    parseInt(Device.osVersion.split('.')[0], 10) >= 15;

  // Use NativeTabs for iOS 15+ (liquid glass support), fallback to standard Tabs
  if (supportsLiquidGlass) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="event-types">
          <Icon sf="link" />
          <Label>Event Types</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="bookings">
          <Icon sf="calendar" />
          <Label>Bookings</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="availability">
          <Icon sf="clock" />
          <Label>Availability</Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="more">
          <Icon sf="ellipsis" />
          <Label>More</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Fallback to standard Expo Router Tabs for older iOS and Android
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0.5,
          borderTopColor: '#C6C6C8',
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
      }}
    >
      <Tabs.Screen
        name="event-types"
        options={{
          title: 'Event Types',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'link' : 'link-outline'} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Availability',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}