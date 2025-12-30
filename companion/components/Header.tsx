import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, type UserProfile } from "@/services/calcom";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { CalComLogo } from "./CalComLogo";

export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await CalComAPIService.getUserProfile();
      setUserProfile(profile);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch user profile");
      if (__DEV__) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.debug("[Header] fetchUserProfile failed", { message, stack });
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleProfile = () => {
    // Navigate to profile sheet on all platforms (Android, Web, Extension)
    router.push("/profile-sheet");
  };

  return (
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
              source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
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
  );
}
