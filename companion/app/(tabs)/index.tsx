import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function TabsIndex() {
  const router = useRouter();
  const { preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    if (!isLoading) {
      switch (preferences.landingPage) {
        case "event-types":
          router.replace("/(tabs)/(event-types)");
          break;
        case "bookings":
          router.replace("/(tabs)/(bookings)");
          break;
        case "bookings:upcoming":
          router.replace("/(tabs)/(bookings)?filter=upcoming");
          break;
        case "bookings:unconfirmed":
          router.replace("/(tabs)/(bookings)?filter=unconfirmed");
          break;
        case "bookings:recurring":
          router.replace("/(tabs)/(bookings)?filter=recurring");
          break;
        case "bookings:past":
          router.replace("/(tabs)/(bookings)?filter=past");
          break;
        case "bookings:cancelled":
          router.replace("/(tabs)/(bookings)?filter=cancelled");
          break;
        default:
          router.replace("/(tabs)/(event-types)");
      }
    }
  }, [isLoading, preferences.landingPage, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="small" color="#111827" />
    </View>
  );
}
