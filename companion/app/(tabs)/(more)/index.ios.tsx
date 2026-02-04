import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryContext } from "@/contexts/QueryContext";
import { useUserProfile } from "@/hooks";
import { showErrorAlert, showNotAvailableAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { getColors } from "@/constants/colors";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    backgroundSecondary: isDark ? "#171717" : "#FFFFFF",
    backgroundActive: isDark ? "#2C2C2E" : "#F8F9FA",
    text: isDark ? "#FFFFFF" : "#333333",
    textSecondary: isDark ? "#A3A3A3" : "#C7C7CC",
    border: isDark ? "#4D4D4D" : "#E5E5EA",
  };

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
        blurEffect={isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light"}
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
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View
          style={{
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary,
            overflow: "hidden",
          }}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.backgroundSecondary,
                paddingHorizontal: 20,
                paddingVertical: 20,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View className="flex-1 flex-row items-center">
                <Ionicons name={item.icon} size={20} color={colors.text} />
                <Text style={{ color: colors.text }} className="ml-3 text-base font-semibold">
                  {item.name}
                </Text>
              </View>
              {item.isExternal ? (
                <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account Link */}
        <View
          style={{
            marginTop: 24,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            onPress={() =>
              openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Delete Account")
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.backgroundSecondary,
              paddingHorizontal: 20,
              paddingVertical: 16,
            }}
            activeOpacity={0.7}
          >
            <View className="flex-1 flex-row items-center">
              <Ionicons name="trash-outline" size={20} color={theme.destructive} />
              <Text className="ml-3 text-base font-medium" style={{ color: theme.destructive }}>
                Delete Account
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View
          style={{
            marginTop: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundSecondary,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.backgroundSecondary,
              paddingHorizontal: 20,
              paddingVertical: 16,
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
            <Text className="ml-2 text-base font-medium" style={{ color: theme.destructive }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text
          style={{ color: isDark ? "#6B7280" : "#9CA3AF" }}
          className="mt-6 px-1 text-center text-xs"
        >
          The companion app is an extension of the web application.{"\n"}
          For advanced features, visit{" "}
          <Text style={{ color: isDark ? "#D1D5DB" : "#1F2937" }}>app.cal.com</Text>
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
