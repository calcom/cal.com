import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { osName } from "expo-device";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
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

/**
 * Get the presentation style for the profile sheet
 * - Uses formSheet on iPhone with liquid glass support
 * - Uses modal on iPad or older iOS devices
 */
function getPresentationStyle(): "formSheet" | "modal" {
  if (isLiquidGlassAvailable() && osName !== "iPadOS") {
    return "formSheet";
  }
  return "modal";
}

export default function ProfileSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: userProfile, isLoading } = useUserProfile();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#111827",
    textSecondary: isDark ? "#A3A3A3" : "#6B7280",
    icon: isDark ? "#FFFFFF" : "#374151",
    iconSecondary: isDark ? "#636366" : "#9CA3AF",
    avatarBg: isDark ? "#4D4D4D" : "#E5E7EB",
    avatarText: isDark ? "#FFFFFF" : "#4B5563",
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

  const presentationStyle = getPresentationStyle();
  const useGlassEffect = isLiquidGlassAvailable();

  // Semi-transparent background to prevent flashes while preserving glass effect
  const glassBackground = isDark ? "rgba(28, 28, 30, 0.01)" : "rgba(248, 248, 250, 0.01)";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerLargeTitle: false,
          title: "You",
          presentation: presentationStyle,
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 0.9],
          sheetInitialDetentIndex: 0,
          contentStyle: {
            backgroundColor: useGlassEffect
              ? glassBackground
              : isDark
                ? theme.backgroundSecondary
                : theme.background,
          },
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerBlurEffect: useGlassEffect ? undefined : isDark ? "dark" : "light",
          headerTintColor: colors.text,
          headerLeft: () => null,
          headerRight: () => null,
        }}
      />

      <Stack.Header>
        <Stack.Header.Title>You</Stack.Header.Title>

        <Stack.Header.Right>
          <Stack.Header.Button
            onPress={handleClose}
            variant="prominent"
            tintColor={theme.backgroundEmphasis}
          >
            <Stack.Header.Icon sf="xmark" />
          </Stack.Header.Button>
        </Stack.Header.Right>
      </Stack.Header>

      <View
        style={{
          flex: 1,
          backgroundColor: useGlassEffect
            ? glassBackground
            : isDark
              ? theme.backgroundSecondary
              : theme.background,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Profile Header */}
        <View className="mt-20 px-6">
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

              {/* Name and Status */}
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
      </View>
    </>
  );
}
