import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Import screen components
import EventTypesScreen from './screens/EventTypesScreen';
import BookingsScreen from './screens/BookingsScreen';
import AvailabilityScreen from './screens/AvailabilityScreen';
import MoreScreen from './screens/MoreScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#000000',
            tabBarInactiveTintColor: '#8E8E93',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#000000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen 
            name="Event Types" 
            component={EventTypesScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="link" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="Bookings" 
            component={BookingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="Availability" 
            component={AvailabilityScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="time" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="More" 
            component={MoreScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="ellipsis-horizontal" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
