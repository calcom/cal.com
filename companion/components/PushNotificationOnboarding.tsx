import { Bell, Calendar, CheckCircle } from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePushNotifications } from "@/contexts/PushNotificationContext";
import { CalComLogo } from "./CalComLogo";

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View className="mb-5 flex-row items-start">
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="mb-1 text-base font-semibold text-gray-900">{title}</Text>
        <Text className="text-sm leading-5 text-gray-600">{description}</Text>
      </View>
    </View>
  );
}

export function PushNotificationOnboarding() {
  const { completeOnboarding, skipOnboarding } = usePushNotifications();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 px-6" style={{ paddingTop: insets.top + 40 }}>
        <View className="mb-8 items-center">
          <CalComLogo width={120} height={28} color="#111827" />
        </View>

        <View className="mb-2 h-16 w-16 items-center justify-center self-center rounded-2xl bg-black">
          <Bell size={32} color="#FFFFFF" />
        </View>

        <Text className="mb-3 mt-6 text-center text-2xl font-bold text-gray-900">Stay Updated</Text>

        <Text className="mb-8 text-center text-base leading-6 text-gray-600">
          Enable push notifications to never miss important updates about your bookings.
        </Text>

        <View className="mb-6 rounded-2xl bg-gray-50 p-5">
          <FeatureItem
            icon={<Calendar size={20} color="#111827" />}
            title="New Bookings"
            description="Get notified instantly when someone books a meeting with you."
          />
          <FeatureItem
            icon={<CheckCircle size={20} color="#111827" />}
            title="Upcoming Meetings"
            description="Receive reminders before your scheduled meetings so you're always prepared."
          />
        </View>

        <View className="rounded-xl bg-blue-50 p-4">
          <Text className="text-center text-sm leading-5 text-blue-800">
            We only send notifications about your bookings. No marketing or promotional messages.
          </Text>
        </View>
      </View>

      <View className="px-6" style={{ paddingBottom: insets.bottom + 28 }}>
        <TouchableOpacity
          onPress={completeOnboarding}
          className="flex-row items-center justify-center rounded-2xl py-[18px]"
          style={[
            { backgroundColor: "#000000" },
            Platform.select({
              web: {
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              },
              default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 6,
              },
            }),
          ]}
          activeOpacity={0.9}
        >
          <Text className="text-[17px] font-semibold text-white">Enable Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={skipOnboarding}
          className="mt-3 items-center justify-center py-3"
          activeOpacity={0.7}
        >
          <Text className="text-[15px] text-gray-500">Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PushNotificationOnboarding;
