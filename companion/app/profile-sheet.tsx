import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import { useUserProfile } from "@/hooks";
import { showSuccessAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getAvatarUrl } from "@/utils/getAvatarUrl";

interface ProfileMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  external?: boolean;
}

export default function ProfileSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: userProfile, isLoading } = useUserProfile();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#A3A3A3" : "#6B7280",
    icon: isDark ? "#FFFFFF" : "#374151",
    iconSecondary: isDark ? "#636366" : "#9CA3AF",
    avatarBg: isDark ? "#4D4D4D" : "#E5E7EB",
    avatarText: isDark ? "#FFFFFF" : "#4B5563",
    activeBackground: isDark ? "#171717" : "#F3F4F6",
  };

  const publicPageUrl = userProfile?.username ? `https://cal.com/${userProfile.username}` : null;

  const menuItems: ProfileMenuItem[] = [
    {
      id: "profile",
      label: "My Profile",
      icon: "person-outline",
      onPress: () =>
        openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Profile page"),
      external: true,
    },
    {
      id: "settings",
      label: "My Settings",
      icon: "settings-outline",
      onPress: () =>
        openInAppBrowser("https://app.cal.com/settings/my-account/general", "Settings page"),
      external: true,
    },
    {
      id: "outOfOffice",
      label: "Out of Office",
      icon: "moon-outline",
      onPress: () =>
        openInAppBrowser(
          "https://app.cal.com/settings/my-account/out-of-office",
          "Out of Office page"
        ),
      external: true,
    },
    {
      id: "publicPage",
      label: "View public page",
      icon: "globe-outline",
      onPress: () => {
        if (publicPageUrl) openInAppBrowser(publicPageUrl, "Public page");
      },
      external: true,
    },
    {
      id: "copyPublicPage",
      label: "Copy public page link",
      icon: "copy-outline",
      onPress: async () => {
        if (publicPageUrl) {
          await Clipboard.setStringAsync(publicPageUrl);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessAlert("Copied!", "Public page link copied to clipboard");
        }
      },
      external: false,
    },
    {
      id: "roadmap",
      label: "Roadmap",
      icon: "map-outline",
      onPress: () => openInAppBrowser("https://cal.com/roadmap", "Roadmap page"),
      external: true,
    },
    {
      id: "help",
      label: "Help",
      icon: "help-circle-outline",
      onPress: () => openInAppBrowser("https://cal.com/help", "Help page"),
      external: true,
    },
  ];

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Profile",
          presentation: "modal",
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerLeft: () => null,
          headerRight: () => (
            <HeaderButtonWrapper side="right">
              <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </HeaderButtonWrapper>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Profile Header */}
        <View className="px-6 py-6">
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <View className="flex-row items-center">
              {/* Avatar */}
              {userProfile?.avatarUrl ? (
                <Image
                  source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 64, height: 64, backgroundColor: colors.avatarBg }}
                >
                  <Text className="text-2xl font-semibold" style={{ color: colors.avatarText }}>
                    {userProfile?.name?.charAt(0).toUpperCase() ||
                      userProfile?.email?.charAt(0).toUpperCase() ||
                      "?"}
                  </Text>
                </View>
              )}

              {/* Name and Email */}
              <View className="ml-4 flex-1">
                <Text className="text-xl font-semibold" style={{ color: colors.text }}>
                  {userProfile?.name || "User"}
                </Text>
                {userProfile?.email ? (
                  <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                    {userProfile.email}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View className="px-2 py-4">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              className={`flex-row items-center justify-between rounded-xl px-4 py-4 ${
                index < menuItems.length - 1 ? "mb-1" : ""
              }`}
              style={{ backgroundColor: "transparent" }}
              onPress={item.onPress}
            >
              <View className="flex-row items-center">
                <Ionicons name={item.icon} size={22} color={colors.icon} />
                <Text className="ml-4 text-base" style={{ color: colors.text }}>
                  {item.label}
                </Text>
              </View>
              {item.external ? (
                <Ionicons name="open-outline" size={18} color={colors.iconSecondary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.iconSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
