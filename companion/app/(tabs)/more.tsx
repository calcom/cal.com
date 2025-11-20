import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";

interface MoreMenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  isExternal?: boolean;
  href?: string;
  onPress?: () => void;
}

export default function More() {
  const router = useRouter();
  const { logout } = useAuth();

  const openExternalLink = async (url: string, fallbackMessage: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", `Cannot open ${fallbackMessage} on your device.`);
      }
    } catch (error) {
      console.error(`Failed to open ${url}:`, error);
      Alert.alert("Error", `Failed to open ${fallbackMessage}. Please try again.`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }
        }
      ]
    );
  };

  const menuItems: MoreMenuItem[] = [
    {
      name: "Profile",
      icon: "person-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://app.cal.com/settings/my-account/profile", "Profile page"),
    },
    {
      name: "Apps",
      icon: "grid-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://app.cal.com/apps", "Apps page"),
    },
    {
      name: "Routing",
      icon: "git-branch-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://app.cal.com/routing", "Routing page"),
    },
    {
      name: "Workflows",
      icon: "flash-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://app.cal.com/workflows", "Workflows page"),
    },
    {
      name: "Insights",
      icon: "bar-chart-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://app.cal.com/insights", "Insights page"),
    },
    {
      name: "Support",
      icon: "help-circle-outline",
      isExternal: true,
      onPress: () => openExternalLink("https://go.cal.com/support", "Support"),
    },
    {
      name: "Sign Out",
      icon: "log-out-outline",
      onPress: handleLogout,
    },
  ];

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <Header />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.href ? () => router.push(item.href!) : item.onPress}
              className={`bg-white active:bg-[#F8F9FA] flex-row items-center justify-between px-5 py-5 ${
                index < menuItems.length - 1 ? "border-b border-[#E5E5EA]" : ""
              }`}
            >
              <View className="flex-row flex-1 items-center">
                <Ionicons name={item.icon} size={20} color="#333" />
                <Text className="text-base font-semibold text-[#333] ml-3">{item.name}</Text>
              </View>
              {item.isExternal ? (
                <Ionicons name="open-outline" size={20} color="#C7C7CC" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text className="mt-4 text-sm text-gray-500">
          We view the companion as an extension of the web application. If you are performing any complicated actions, please refer back to the web application.
        </Text>
      </ScrollView>
    </View>
  );
}
