import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";

import { CalComAPIService, UserProfile } from "../services/calcom";

export default function Profile() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [timeFormat, setTimeFormat] = useState<12 | 24>(12);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await CalComAPIService.getCurrentUser();
      setProfile(profileData);
      
      // Populate form fields
      setName(profileData.name || "");
      setEmail(profileData.email || "");
      setUsername(profileData.username || "");
      setBio(profileData.bio || "");
      setTimeZone(profileData.timeZone || "");
      setWeekStart(profileData.weekStart || "Sunday");
      setTimeFormat((profileData.timeFormat as 12 | 24) || 12);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile. Please try again.");
      Alert.alert("Error", "Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setSaving(true);
    try {
      await CalComAPIService.updateUserProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        timeZone,
        weekStart,
        timeFormat,
      });

      Alert.alert("Success", "Profile updated successfully");
      await fetchProfile();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa]">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f9fa] p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
          {error || "Profile not found"}
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-lg bg-black px-6 py-3"
          onPress={() => router.back()}>
          <Text className="text-base font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Profile",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              className={`px-2 md:px-4 py-2 bg-black rounded-[10px] min-w-[70px] items-center mr-4 ${saving ? "opacity-60" : ""}`}
              onPress={handleSave}
              disabled={saving}>
              <Text className="text-white text-base font-semibold">Update</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View className="flex-1 bg-[#f8f9fa]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}>

          {/* Profile Picture */}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-base font-semibold text-[#333] mb-4">Profile Picture</Text>
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-black items-center justify-center mr-4">
                <Text className="text-2xl font-semibold text-white">
                  {name ? name.charAt(0).toUpperCase() : profile?.email?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
              <TouchableOpacity
                className="px-2 md:px-4 py-2 bg-white border border-[#E5E5EA] rounded-lg"
                onPress={() => Alert.alert("Coming Soon", "Avatar upload will be available soon")}>
                <Text className="text-base font-medium text-[#333]">Upload Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Username */}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-base font-semibold text-[#333] mb-2">Username</Text>
            <View className="flex-row items-center bg-[#F0F0F0] border border-[#E5E5EA] rounded-lg">
              <Text className="text-base text-[#999] px-3" style={{ lineHeight: 20 }}>cal.com/</Text>
              <TextInput
                className="flex-1 py-3 pr-3 text-base text-[#999]"
                value={username}
                editable={false}
                style={{ lineHeight: 17 }}
              />
            </View>
            <View className="flex-row items-start mt-2">
              <Ionicons name="information-circle-outline" size={16} color="#666" style={{ marginTop: 2, marginRight: 4 }} />
              <Text className="flex-1 text-xs text-[#666] leading-4">
                Tip: You can add a '+' between usernames: cal.com/anna+brian to make a dynamic group meeting
              </Text>
            </View>
          </View>

          {/* Full Name */}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-base font-semibold text-[#333] mb-2">Full name</Text>
            
            <TextInput
              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black"
              placeholder="Your name"
              placeholderTextColor="#8E8E93"
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>

          {/* Email */}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-base font-semibold text-[#333] mb-2">Email</Text>
            <View className="flex-row items-center justify-between mb-2">
              <TextInput
                className="flex-1 bg-[#F0F0F0] border border-[#E5E5EA] rounded-lg px-3 text-base text-[#999]"
                value={email}
                editable={false}
                style={{ height: 30 }}
              />
              <View className="ml-2 bg-[#E8F5E9] px-3 rounded" style={{ height: 30, justifyContent: 'center' }}>
                <Text className="text-xs font-medium text-[#2E7D32]">Primary</Text>
              </View>
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => Alert.alert("Coming Soon", "Add secondary email will be available soon")}>
              <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
              <Text className="text-base text-[#007AFF] ml-2">Add Email</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-base font-semibold text-[#333] mb-2">About</Text>
            <TextInput
              className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-lg px-3 py-3 text-base text-black min-h-[100px]"
              placeholder="A little something about yourself"
              placeholderTextColor="#8E8E93"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}

