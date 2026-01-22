import { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Region, DEFAULT_REGION, REGION_OPTIONS, getSignupUrl } from "@/config/region";
import { useAuth } from "@/contexts/AuthContext";
import { showErrorAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";

import { CalComLogo } from "./CalComLogo";

export function LoginScreen() {
  const { loginWithOAuth, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedRegion, setSelectedRegion] = useState<Region>(DEFAULT_REGION);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  const handleOAuthLogin = async () => {
    try {
      await loginWithOAuth(selectedRegion);
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
    await openInAppBrowser(getSignupUrl(selectedRegion), "Sign up page");
  };

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
    setIsRegionDropdownOpen(false);
  };

  const selectedRegionLabel = REGION_OPTIONS.find((opt) => opt.value === selectedRegion)?.label;

  return (
    <View className="flex-1 bg-white">
      {/* Logo centered in the middle */}
      <View className="flex-1 items-center justify-center">
        <CalComLogo width={180} height={40} color="#111827" />
      </View>

      {/* Bottom section with region selector and button */}
      <View className="px-6" style={{ paddingBottom: insets.bottom + 28 }}>
        {/* Region selector dropdown */}
        <View className="mb-4">
          <Text className="mb-2 text-[14px] font-medium text-gray-700">Data region</Text>
          <View className="relative">
            <TouchableOpacity
              onPress={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3"
              activeOpacity={0.7}
            >
              <Text className="text-[15px] text-gray-900">{selectedRegionLabel}</Text>
              <Text className="text-gray-500">{isRegionDropdownOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isRegionDropdownOpen && (
              <View
                className="absolute left-0 right-0 rounded-lg border border-gray-300 bg-white"
                style={{
                  top: 52,
                  zIndex: 10,
                  ...Platform.select({
                    web: { boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" },
                    default: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    },
                  }),
                }}
              >
                {REGION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleRegionSelect(option.value)}
                    className="border-b border-gray-100 px-4 py-3 last:border-b-0"
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-[15px] ${
                        selectedRegion === option.value
                          ? "font-semibold text-gray-900"
                          : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Primary CTA button */}
        <TouchableOpacity
          onPress={handleOAuthLogin}
          disabled={loading}
          className="flex-row items-center justify-center rounded-2xl py-[18px]"
          style={[
            { backgroundColor: loading ? "#9CA3AF" : "#000000" },
            Platform.select({
              web: {
                boxShadow: loading ? "none" : "0 4px 12px rgba(0, 0, 0, 0.2)",
              },
              default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0 : 0.2,
                shadowRadius: 12,
                elevation: loading ? 0 : 6,
              },
            }),
          ]}
          activeOpacity={0.9}
        >
          <Text className="text-[17px] font-semibold text-white">Continue with Cal.com</Text>
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
              <Text className="text-[15px] text-gray-500">
                Don't have an account? <Text className="font-semibold text-gray-900">Sign up</Text>
              </Text>
              <View className="h-px bg-gray-400" style={{ marginTop: 2 }} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default LoginScreen;
