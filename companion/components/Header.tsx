import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Modal, Alert, Linking, Platform, ActionSheetIOS } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, UserProfile } from "../services/calcom";
import { CalComLogo } from "./CalComLogo";
import { useAuth } from "../contexts/AuthContext";

export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
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

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log("Search pressed");
  };

  const handleProfile = () => {
    if (Platform.OS === 'ios') {
      const options = [
        'Cancel',
        'My Profile',
        'My Settings', 
        'Out of Office',
        'Help',
        'Sign Out'
      ];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: 6, // Sign Out
          cancelButtonIndex: 0,
          title: userProfile?.name || 'Profile Menu'
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1: // My Profile
              handleMenuOption('profile');
              break;
            case 2: // My Settings
              handleMenuOption('settings');
              break;
            case 3: // Out of Office
              handleMenuOption('outOfOffice');
              break;
            case 4: // Support
              handleMenuOption('help');
              break;
            case 5: // Sign Out
              handleMenuOption('signOut');
              break;
          }
        }
      );
    } else {
      setShowProfileModal(true);
    }
  };

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

  const handleMenuOption = (option: string) => {
    if (Platform.OS !== 'ios') {
      setShowProfileModal(false);
    }
    switch (option) {
      case "profile":
        openExternalLink("https://app.cal.com/settings/my-account/profile", "Profile page");
        break;
      case "settings":
        openExternalLink("https://app.cal.com/settings/my-account", "Settings page");
        break;
      case "outOfOffice":
        openExternalLink("https://app.cal.com/settings/my-account/out-of-office", "Out of Office page");
        break;
      case "roadmap":
        openExternalLink("https://cal.com/roadmap", "Roadmap");
        break;
      case "help":
        openExternalLink("https://cal.com/help", "Help page");
        break;
      case "signOut":
        Alert.alert(
          "Sign Out",
          "Are you sure you want to sign out?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign Out",
              style: "destructive",
              onPress: async () => {
                try {
                  await logout();
                  router.replace('/auth/login');
                } catch (error) {
                  console.error('Logout failed:', error);
                }
              },
            },
          ]
        );
        break;
    }
  };

  return (
    <>
      <View
        className="bg-white border-b border-[#E5E5EA] flex-row items-center justify-between px-2 md:px-4"
        style={{ paddingTop: insets.top + 4 , paddingBottom: 4 }}
      >
        {/* Left: Cal.com Logo */}
        <View className="ms-1">
          <CalComLogo width={101} height={22} color="#333" />
        </View>

        {/* Right: Icons */}
        <View className="flex-row items-center gap-4">
          {/* Search Icon */}
          <TouchableOpacity onPress={handleSearch} className="p-2">
            <Ionicons name="search-outline" size={24} color="#333" />
          </TouchableOpacity>

          {/* Profile Picture */}
          <TouchableOpacity onPress={handleProfile} className="p-1">
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : userProfile?.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                className="w-8 h-8 rounded-full"
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ) : (
              <View className="bg-[#E5E5EA] rounded-full items-center justify-center" style={{ width: 32, height: 32 }}>
                <Ionicons name="person-outline" size={20} color="#666" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}>
          <TouchableOpacity
            className="bg-white rounded-2xl w-full max-w-sm mx-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            
            {/* Header with profile info */}
            <View className="p-6 border-b border-gray-200">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-black items-center justify-center mr-3">
                  {userProfile?.avatarUrl ? (
                    <Image
                      source={{ uri: userProfile.avatarUrl }}
                      className="w-12 h-12 rounded-full"
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <Text className="text-lg font-semibold text-white">
                      {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : userProfile?.email?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {userProfile?.name || "User"}
                  </Text>
                  {userProfile?.email && (
                    <Text className="text-sm text-gray-600">
                      {userProfile.email}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            
            {/* Menu Items */}
            <View className="p-2">
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("profile")}>
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">My Profile</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("settings")}>
                <View className="flex-row items-center">
                  <Ionicons name="settings-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">My Settings</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("outOfOffice")}>
                <View className="flex-row items-center">
                  <Ionicons name="moon-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Out of Office</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <View className="h-px bg-gray-200 mx-4 my-2" />
              
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("roadmap")}>
                <View className="flex-row items-center">
                  <Ionicons name="map-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Roadmap</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-row items-center justify-between p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("help")}>
                <View className="flex-row items-center">
                  <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900">Help</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              <View className="h-px bg-gray-200 mx-4 my-2" />
              
              <TouchableOpacity
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
                onPress={() => handleMenuOption("signOut")}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text className="ml-3 text-base text-red-500">Sign Out</Text>
              </TouchableOpacity>
            </View>
            
            {/* Cancel button */}
            <View className="p-2 md:p-4 border-t border-gray-200">
              <TouchableOpacity
                className="w-full p-3 bg-gray-100 rounded-lg"
                onPress={() => setShowProfileModal(false)}>
                <Text className="text-center text-base font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

