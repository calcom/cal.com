import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import { showErrorAlert } from "../../utils/alerts";
import { openInAppBrowser } from "../../utils/browser";

interface MoreMenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  isExternal?: boolean;
  href?: string;
  onPress?: () => void;
}

export default function More() {
  const router = useRouter();
  const { logout, userInfo } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout error:", error);
            showErrorAlert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const menuItems: MoreMenuItem[] = [
    {
      name: "Profile",
      icon: "person-outline",
      isExternal: true,
      onPress: () =>
        openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Profile page"),
    },
    {
      name: "Apps",
      icon: "grid-outline",
      isExternal: true,
      onPress: () => openInAppBrowser("https://app.cal.com/apps", "Apps page"),
    },
    {
      name: "Routing",
      icon: "git-branch-outline",
      isExternal: true,
      onPress: () => openInAppBrowser("https://app.cal.com/routing", "Routing page"),
    },
    {
      name: "Workflows",
      icon: "flash-outline",
      isExternal: true,
      onPress: () => openInAppBrowser("https://app.cal.com/workflows", "Workflows page"),
    },
    {
      name: "Insights",
      icon: "bar-chart-outline",
      isExternal: true,
      onPress: () => openInAppBrowser("https://app.cal.com/insights", "Insights page"),
    },
    {
      name: "Support",
      icon: "help-circle-outline",
      isExternal: true,
      onPress: () => openInAppBrowser("https://go.cal.com/support", "Support"),
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

        {/* Account Section */}
        <View className="mt-6">
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Account
          </Text>
          <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
            {/* User Info */}
            {userInfo && (
              <View className="flex-row items-center border-b border-[#E5E5EA] px-5 py-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-900">
                  <Text className="text-base font-semibold text-white">
                    {userInfo.name?.charAt(0)?.toUpperCase() ||
                      userInfo.email?.charAt(0)?.toUpperCase() ||
                      "?"}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-[#333]" numberOfLines={1}>
                    {userInfo.name || "Cal.com User"}
                  </Text>
                  <Text className="text-sm text-gray-500" numberOfLines={1}>
                    {userInfo.email}
                  </Text>
                </View>
              </View>
            )}

            {/* Sign Out Button */}
            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center justify-center bg-white px-5 py-4 active:bg-red-50"
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text className="ml-2 text-base font-medium text-red-600">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Note */}
        <Text className="mt-6 px-1 text-center text-xs text-gray-400">
          The companion app is an extension of the web application.{"\n"}
          For advanced features, visit{" "}
          <Text
            className="text-gray-800"
            onPress={() => openInAppBrowser("https://app.cal.com", "Cal.com")}
          >
            app.cal.com
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}
