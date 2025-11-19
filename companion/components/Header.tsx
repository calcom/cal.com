import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, UserProfile } from "../services/calcom";
import { CalComLogo } from "./CalComLogo";

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

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log("Search pressed");
  };

  const handleProfile = () => {
    setShowProfileModal(true);
  };

  const handleMenuOption = (option: string) => {
    setShowProfileModal(false);
    switch (option) {
      case "profile":
        router.push("/profile");
        break;
      case "settings":
        // TODO: Navigate to settings page
        console.log("My Settings pressed");
        break;
      case "outOfOffice":
        // TODO: Navigate to out of office page
        console.log("Out of Office pressed");
        break;
      case "roadmap":
        // TODO: Open roadmap link
        console.log("Roadmap pressed");
        break;
      case "help":
        // TODO: Open help
        console.log("Help pressed");
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
              onPress: () => {
                // TODO: Implement sign out
                console.log("Sign Out pressed");
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
        className="bg-white border-b border-[#E5E5EA] flex-row items-center justify-between px-4"
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
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowProfileModal(false)}
            className="absolute inset-0"
          />
          <View className="bg-white rounded-t-3xl">
            {/* Menu Items */}
            <View style={{ paddingTop: 16, paddingBottom: 10 }}>
              {/* My Profile */}
              <TouchableOpacity
                onPress={() => handleMenuOption("profile")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="person-outline" size={20} color="#333" />
                <Text className="text-base text-[#333] ml-3">My Profile</Text>
              </TouchableOpacity>

              {/* My Settings */}
              <TouchableOpacity
                onPress={() => handleMenuOption("settings")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="settings-outline" size={20} color="#333" />
                <Text className="text-base text-[#333] ml-3">My Settings</Text>
              </TouchableOpacity>

              {/* Out of Office */}
              <TouchableOpacity
                onPress={() => handleMenuOption("outOfOffice")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="moon-outline" size={20} color="#333" />
                <Text className="text-base text-[#333] ml-3">Out of Office</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-[#E5E5EA] mx-6 my-2" />

              {/* Roadmap */}
              <TouchableOpacity
                onPress={() => handleMenuOption("roadmap")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="map-outline" size={20} color="#333" />
                <Text className="text-base text-[#333] ml-3">Roadmap</Text>
              </TouchableOpacity>

              {/* Help */}
              <TouchableOpacity
                onPress={() => handleMenuOption("help")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="help-circle-outline" size={20} color="#333" />
                <Text className="text-base text-[#333] ml-3">Help</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-[#E5E5EA] mx-6 my-2" />

              {/* Sign Out */}
              <TouchableOpacity
                onPress={() => handleMenuOption("signOut")}
                className="flex-row items-center pl-10 pr-6 py-2 active:bg-[#F8F9FA]"
              >
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text className="text-base text-[#FF3B30] ml-3">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

