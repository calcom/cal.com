import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { getRouteFromPreference, useUserPreferences } from "@/hooks/useUserPreferences";

export default function TabsIndex() {
  const { preferences, isLoading } = useUserPreferences();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="small" color="#111827" />
      </View>
    );
  }

  const route = getRouteFromPreference(preferences.landingPage);
  console.log("[TabsIndex] Redirecting to:", route, "from preference:", preferences.landingPage);

  // biome-ignore lint/suspicious/noExplicitAny: expo-router types don't support dynamic route strings from preferences
  return <Redirect href={route as any} />;
}
