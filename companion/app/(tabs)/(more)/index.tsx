import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Header } from "@/components/Header";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryContext } from "@/contexts/QueryContext";
import { showErrorAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getColors } from "@/constants/colors";

interface MoreMenuItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  isExternal?: boolean;
  href?: string;
  onPress?: () => void;
}

export default function More() {
  const { logout } = useAuth();
  const { clearCache } = useQueryContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

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
    if (Platform.OS === "web") {
      // Use modal for web/extension since Alert.alert doesn't work
      setShowLogoutModal(true);
    } else {
      // Use native Alert for Android
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
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white"
          style={{ borderColor: theme.border, backgroundColor: theme.backgroundSecondary }}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.name}
              onPress={item.onPress}
              className={`flex-row items-center justify-between bg-white px-5 py-5 active:bg-[#F8F9FA]`}
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}
            >
              <View className="flex-1 flex-row items-center">
                <Ionicons name={item.icon} size={20} color={theme.text} />
                <Text className="ml-3 text-base font-semibold" style={{ color: theme.text }}>
                  {item.name}
                </Text>
              </View>
              {item.isExternal ? (
                <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Account Link */}
        <View
          className="mt-6 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white"
          style={{ borderColor: theme.border, backgroundColor: theme.backgroundSecondary }}
        >
          <TouchableOpacity
            onPress={() =>
              openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Delete Account")
            }
            className="flex-row items-center justify-between bg-white px-5 py-4 active:bg-red-50"
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <View className="flex-1 flex-row items-center">
              <Ionicons name="trash-outline" size={20} color={theme.destructive} />
              <Text className="ml-3 text-base font-medium" style={{ color: theme.destructive }}>
                Delete Account
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View
          className="mt-4 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white"
          style={{ borderColor: theme.border, backgroundColor: theme.backgroundSecondary }}
        >
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-center bg-white px-5 py-4 active:bg-red-50"
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
            <Text className="ml-2 text-base font-medium" style={{ color: theme.destructive }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text
          className="mt-6 px-1 text-center text-xs text-gray-400"
          style={{ color: theme.textMuted }}
        >
          The companion app is an extension of the web application.{"\n"}
          For advanced features, visit{" "}
          <Text
            style={{ color: theme.text }}
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
