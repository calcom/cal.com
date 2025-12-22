import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, UserProfile } from "../services/calcom";
import { CalComLogo } from "./CalComLogo";
import { FullScreenModal } from "./FullScreenModal";
import { openInAppBrowser } from "../utils/browser";

export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await CalComAPIService.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build public page URL
  const publicPageUrl = userProfile?.username ? `https://cal.com/${userProfile.username}` : null;

  const handleViewPublicPage = () => {
    if (publicPageUrl) {
      openInAppBrowser(publicPageUrl, "Public page");
    }
  };

  const handleCopyPublicPageLink = async () => {
    if (!publicPageUrl) return;
    try {
      await Clipboard.setStringAsync(publicPageUrl);
      Alert.alert("Link Copied!", "Your public page link has been copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy public page link:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  };

  const handleProfile = () => {
    if (Platform.OS === "ios") {
      const options = [
        "Cancel",
        "My Profile",
        "My Settings",
        "Out of Office",
        "View public page",
        "Copy public page link",
        "Help",
      ];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          title: userProfile?.name || "Profile Menu",
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1: // My Profile
              handleMenuOption("profile");
              break;
            case 2: // My Settings
              handleMenuOption("settings");
              break;
            case 3: // Out of Office
              handleMenuOption("outOfOffice");
              break;
            case 4: // View public page
              handleViewPublicPage();
              break;
            case 5: // Copy public page link
              handleCopyPublicPageLink();
              break;
            case 6: // Help
              handleMenuOption("help");
              break;
          }
        }
      );
    } else {
      setShowProfileModal(true);
    }
  };

  const handleMenuOption = (option: string) => {
    if (Platform.OS !== "ios") {
      setShowProfileModal(false);
    }
    switch (option) {
      case "profile":
        openInAppBrowser("https://app.cal.com/settings/my-account/profile", "Profile page");
        break;
      case "settings":
        openInAppBrowser("https://app.cal.com/settings/my-account", "Settings page");
        break;
      case "outOfOffice":
        openInAppBrowser(
          "https://app.cal.com/settings/my-account/out-of-office",
          "Out of Office page"
        );
        break;
      case "roadmap":
        openInAppBrowser("https://cal.com/roadmap", "Roadmap");
        break;
      case "help":
        openInAppBrowser("https://cal.com/help", "Help page");
        break;
    }
  };

  return (
    <>
      <View
        className="flex-row items-center justify-between border-b border-[#E5E5EA] bg-white px-2 md:px-4"
        style={{ paddingTop: insets.top + 4, paddingBottom: 4 }}
      >
        {/* Left: Cal.com Logo */}
        <View className="ms-1">
          <CalComLogo width={101} height={22} color="#333" />
        </View>

        {/* Right: Icons */}
        <View
          className="flex-row items-center gap-4"
          style={Platform.OS === "web" ? { marginRight: 8 } : {}}
        >
          {/* Profile Picture */}
          <TouchableOpacity onPress={handleProfile} className="p-1">
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : userProfile?.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                className="h-8 w-8 rounded-full"
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <View
                className="items-center justify-center rounded-full bg-[#E5E5EA]"
                style={{ width: 32, height: 32 }}
              >
                <Ionicons name="person-outline" size={20} color="#666" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu Modal */}
      <FullScreenModal
        visible={showProfileModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header with profile info */}
            <View className="border-b border-gray-200 p-6">
              <View className="flex-row items-center">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-black">
                  {userProfile?.avatarUrl ? (
                    <Image
                      source={{ uri: userProfile.avatarUrl }}
                      className="h-12 w-12 rounded-full"
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <Text className="text-lg font-semibold text-white">
                      {userProfile?.name
                        ? userProfile.name.charAt(0).toUpperCase()
                        : userProfile?.email?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {userProfile?.name || "User"}
                  </Text>
                  {userProfile?.email ? (
                    <Text className="text-sm text-gray-600">{userProfile.email}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View className="p-2">
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => handleMenuOption("profile")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">My Profile</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => handleMenuOption("settings")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="settings-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">My Settings</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => handleMenuOption("outOfOffice")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="moon-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Out of Office</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>

              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* View public page */}
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => {
                  setShowProfileModal(false);
                  handleViewPublicPage();
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">View public page</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>

              {/* Copy public page link */}
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => {
                  setShowProfileModal(false);
                  handleCopyPublicPageLink();
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="copy-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Copy public page link</Text>
                </View>
              </TouchableOpacity>

              <View className="mx-4 my-2 h-px bg-gray-200" />

              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => handleMenuOption("roadmap")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="map-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Roadmap</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-between p-2 hover:bg-gray-50 md:p-4"
                onPress={() => handleMenuOption("help")}
              >
                <View className="flex-row items-center">
                  <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Help</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3"
                onPress={() => setShowProfileModal(false)}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    </>
  );
}
