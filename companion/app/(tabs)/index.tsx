import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getRouteFromPreference, useUserPreferences } from "@/hooks/useUserPreferences";

export default function TabsIndex() {
  const router = useRouter();
  const { preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    if (!isLoading) {
      const route = getRouteFromPreference(preferences.landingPage);
      router.replace(route);
    }
  }, [isLoading, preferences.landingPage, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="small" color="#111827" />
    </View>
  );
}
