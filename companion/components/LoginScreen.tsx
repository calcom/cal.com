import React from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { CalComLogo } from "./CalComLogo";

export function LoginScreen() {
  const { loginWithOAuth, loading } = useAuth();
  const insets = useSafeAreaInsets();

  const handleOAuthLogin = async () => {
    try {
      await loginWithOAuth();
    } catch (error) {
      console.error("OAuth login error:", error);
      Alert.alert(
        "Login Failed",
        error instanceof Error
          ? error.message
          : "Failed to login with OAuth. Please check your configuration and try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSignUp = () => {
    Linking.openURL("https://app.cal.com/signup");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Logo centered in the middle */}
      <View className="flex-1 items-center justify-center">
        <CalComLogo width={180} height={40} color="#111827" />
      </View>

      {/* Button at the bottom */}
      <View className="px-6" style={{ paddingBottom: insets.bottom + 40 }}>
        <TouchableOpacity
          onPress={handleOAuthLogin}
          disabled={loading}
          className="flex-row items-center justify-center rounded-lg bg-gray-900 px-6 py-4"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <ActivityIndicator size="small" color="white" className="mr-2" /> : null}
          <Text className="text-lg font-semibold text-white">
            {loading ? "Signing in..." : "Continue with Cal.com"}
          </Text>
        </TouchableOpacity>

        {/* Sign up link */}
        <TouchableOpacity
          onPress={handleSignUp}
          className="mt-2 flex-row items-center justify-center"
          style={{ cursor: "pointer" } as any}
        >
          <View>
            <Text className="text-center text-base text-gray-500">Don't have an account?</Text>
            <View className="mt-1/2 h-px bg-gray-400" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default LoginScreen;
