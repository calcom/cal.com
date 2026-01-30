import { Platform, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { CalComLogo } from "./CalComLogo";

export function LoginScreen() {
  const { loginWithOAuth, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleOAuthLogin = async () => {
    try {
      await loginWithOAuth();
    } catch (error) {
      console.error("OAuth login error");
      showErrorAlert(
        "Login Failed",
        error instanceof Error
          ? error.message
          : "Failed to login with OAuth. Please check your configuration and try again."
      );
    }
  };

  const handleSignUp = async () => {
    await openInAppBrowser("https://app.cal.com/signup", "Sign up page");
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Logo centered in the middle */}
      <View className="flex-1 items-center justify-center">
        <CalComLogo width={180} height={40} color={isDark ? "#FFFFFF" : "#111827"} />
      </View>

      {/* Bottom section with button */}
      <View className="px-6" style={{ paddingBottom: insets.bottom + 28 }}>
        {/* Primary CTA button */}
        <TouchableOpacity
          onPress={handleOAuthLogin}
          disabled={loading}
          className="flex-row items-center justify-center rounded-2xl py-[18px]"
          style={[
            { backgroundColor: loading ? "#9CA3AF" : isDark ? "#FFFFFF" : "#000000" },
            Platform.select({
              web: {
                boxShadow: loading ? "none" : "0 4px 12px rgba(0, 0, 0, 0.2)",
              },
              default: {
                shadowColor: isDark ? "#FFF" : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0 : 0.2,
                shadowRadius: 12,
                elevation: loading ? 0 : 6,
              },
            }),
          ]}
          activeOpacity={0.9}
        >
          <Text
            className="text-[17px] font-semibold"
            style={{ color: isDark ? "#000000" : "#FFFFFF" }}
          >
            Continue with Cal.com
          </Text>
        </TouchableOpacity>

        {/* Sign up link - hidden on iOS */}
        {Platform.OS !== "ios" && (
          <TouchableOpacity
            onPress={handleSignUp}
            className="mt-3 items-center justify-center py-1"
            style={Platform.OS === "web" ? { cursor: "pointer" } : undefined}
            activeOpacity={0.7}
          >
            <View>
              <Text className="text-[15px] text-gray-500 dark:text-[#A3A3A3]">
                Don't have an account?{" "}
                <Text className="font-semibold text-gray-900 dark:text-white">Sign up</Text>
              </Text>
              <View className="h-px bg-gray-400 dark:bg-[#4D4D4D]" style={{ marginTop: 2 }} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default LoginScreen;
