import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { LogoutConfirmModal } from "../../components/LogoutConfirmModal";
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
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const performLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
      showErrorAlert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      // Use modal for web/extension since Alert.alert doesn't work
      setShowLogoutModal(true);
    } else {
      // Use native Alert for iOS/Android
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]);
    }
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

        {/* Sign Out Button */}
        <View className="mt-6 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-center bg-white px-5 py-4 active:bg-red-50"
          >
            <Ionicons name="log-out-outline" size={20} color="#800000" />
            <Text className="ml-2 text-base font-medium text-[#800000]">Sign Out</Text>
          </TouchableOpacity>
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

      {/* Logout Confirmation Modal for Web */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onConfirm={() => {
          setShowLogoutModal(false);
          performLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}
