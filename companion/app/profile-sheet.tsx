import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserProfile } from "@/hooks";
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
          Alert.alert("Copied!", "Public page link copied to clipboard");
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
            backgroundColor: "#FFFFFF",
          },
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Profile Header */}
        <View className="border-b border-gray-200 px-6 py-6">
          {isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#000" />
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
                  className="items-center justify-center rounded-full bg-gray-200"
                  style={{ width: 64, height: 64 }}
                >
                  <Text className="text-2xl font-semibold text-gray-600">
                    {userProfile?.name?.charAt(0).toUpperCase() ||
                      userProfile?.email?.charAt(0).toUpperCase() ||
                      "?"}
                  </Text>
                </View>
              )}

              {/* Name and Email */}
              <View className="ml-4 flex-1">
                <Text className="text-xl font-semibold text-gray-900">
                  {userProfile?.name || "User"}
                </Text>
                {userProfile?.email ? (
                  <Text className="mt-1 text-sm text-gray-500">{userProfile.email}</Text>
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
              className={`flex-row items-center justify-between rounded-xl px-4 py-4 active:bg-gray-100 ${
                index < menuItems.length - 1 ? "mb-1" : ""
              }`}
              onPress={item.onPress}
            >
              <View className="flex-row items-center">
                <Ionicons name={item.icon} size={22} color="#374151" />
                <Text className="ml-4 text-base text-gray-900">{item.label}</Text>
              </View>
              {item.external ? (
                <Ionicons name="open-outline" size={18} color="#9CA3AF" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
