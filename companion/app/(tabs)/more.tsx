import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { LogoutButton } from "../../components/LogoutButton";
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
  const { isUsingOAuth } = useAuth();

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

  const menuItems: MoreMenuItem[] = [
    {
      name: "Profile",
      icon: "person-outline",
      isExternal: true,
      onPress: () =>
        openExternalLink("https://app.cal.com/settings/my-account/profile", "Profile page"),
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
  ];

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <Header />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.href ? () => router.push(item.href!) : item.onPress}
              className={`flex-row items-center justify-between bg-white px-5 py-5 active:bg-[#F8F9FA] ${
                index < menuItems.length - 1 ? "border-b border-[#E5E5EA]" : ""
              }`}
            >
              <View className="flex-1 flex-row items-center">
                <Ionicons name={item.icon} size={20} color="#333" />
                <Text className="ml-3 text-base font-semibold text-[#333]">{item.name}</Text>
              </View>
              {item.isExternal ? (
                <Ionicons name="open-outline" size={20} color="#C7C7CC" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Authentication Info and Logout */}
        <View className="mt-6 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <View className="border-b border-[#E5E5EA] px-5 py-4">
            <Text className="text-sm font-medium text-gray-700">Authentication</Text>
          </View>
          <View className="px-5 py-4">
            <LogoutButton variant="destructive" className="w-full" />
          </View>
        </View>

        <Text className="mt-4 text-sm text-gray-500">
          We view the companion as an extension of the web application. If you are performing any
          complicated actions, please refer back to the web application.
        </Text>
      </ScrollView>
    </View>
  );
}
