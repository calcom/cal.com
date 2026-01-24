import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryContext } from "@/contexts/QueryContext";
import { useUserProfile } from "@/hooks";
import { showErrorAlert, showNotAvailableAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getAvatarUrl } from "@/utils/getAvatarUrl";

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
  const { clearCache } = useQueryContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { data: userProfile } = useUserProfile();

  const performLogout = async () => {
    try {
      // Clear in-memory cache before logout
      await clearCache();
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Logout error", message);
      if (__DEV__) {
        const stack = error instanceof Error ? error.stack : undefined;
        console.debug("[More] logout failed", { message, stack });
      }
      showErrorAlert("Error", "Failed to sign out. Please try again.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  };

  // handleNotAvailable replaced by global showNotAvailableAlert

  const menuItems: MoreMenuItem[] = [
    {
      name: "Apps",
      icon: "grid-outline",
      isExternal: false,
      onPress: () => showNotAvailableAlert(),
    },
    {
      name: "Routing",
      icon: "git-branch-outline",
      isExternal: false,
      onPress: () => showNotAvailableAlert(),
    },
    {
      name: "Workflows",
      icon: "flash-outline",
      isExternal: false,
      onPress: () => showNotAvailableAlert(),
    },
    {
      name: "Insights",
      icon: "bar-chart-outline",
      isExternal: false,
      onPress: () => showNotAvailableAlert(),
    },
    {
      name: "Support",
      icon: "help-circle-outline",
      isExternal: false,
      onPress: () => showNotAvailableAlert(),
    },
  ];

  return (
    <>
      {/* iOS Native Header with Glass UI */}
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"}
      >
        <Stack.Header.Title large>More</Stack.Header.Title>
        <Stack.Header.Right>
          {userProfile?.avatarUrl ? (
            <Stack.Header.View>
              <Pressable onPress={() => router.push("/profile-sheet")}>
                <Image
                  source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              </Pressable>
            </Stack.Header.View>
          ) : (
            <Stack.Header.Button onPress={() => router.push("/profile-sheet")}>
              <Stack.Header.Icon sf="person.circle.fill" />
            </Stack.Header.Button>
          )}
        </Stack.Header.Right>
      </Stack.Header>

      {/* Content */}
      <ScrollView
        style={{ backgroundColor: "white" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.onPress}
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

        {/* Delete Account Link */}
        <View className="mt-6 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <TouchableOpacity
            onPress={() =>
              openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Delete Account")
            }
            className="flex-row items-center justify-between bg-white px-5 py-4 active:bg-red-50"
          >
            <View className="flex-1 flex-row items-center">
              <Ionicons name="trash-outline" size={20} color="#991B1B" />
              <Text className="ml-3 text-base font-medium text-[#991B1B]">Delete Account</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View className="mt-4 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
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
          For advanced features, visit <Text className="text-gray-800">app.cal.com</Text>
        </Text>
      </ScrollView>

      {/* Logout Confirmation Modal - kept for consistency */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onConfirm={() => {
          setShowLogoutModal(false);
          performLogout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
