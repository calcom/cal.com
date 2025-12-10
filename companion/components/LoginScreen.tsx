import React from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { CalComLogo } from "./CalComLogo";

export function LoginScreen() {
  const { loginWithOAuth, loading } = useAuth();

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

  return (
    <View className="flex-1 justify-center bg-[#F4F4F4] px-6">
      <View className="rounded-3xl bg-white px-5 py-2 shadow-lg shadow-slate-200">
        <View className="mb-8 items-center">
          <CalComLogo width={100} height={100} />
        </View>
        <View className="mb-8">
          <Text className="mb-2 text-center font-cal text-2xl font-bold text-gray-900">
            Welcome to <Text>Companion</Text>
          </Text>
          <Text className="text-center text-gray-600">
            Sign in to take your favourite scheduling tool wherever you go. Cal.com Companion is
            where you find time.
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleOAuthLogin}
          disabled={loading}
          className="mb-4 flex items-center justify-center rounded-2xl bg-gray-900 px-6 py-4"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          <View className="flex flex-row items-center justify-center">
            {loading ? <ActivityIndicator size="small" color="white" className="mr-2" /> : null}
            {loading ? (
              <Text className="text-lg font-semibold text-white">Signing in...</Text>
            ) : (
              <View className="flex flex-row items-center justify-center gap-px">
                <Text className="text-lg font-semibold text-white">Sign in with </Text>
                <View className="-mt-px">
                  <CalComLogo width={74} color="#fff" />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            // Open signup link in system browser
            // @ts-ignore
            if (typeof window !== "undefined" && window.open) {
              window.open("https://app.cal.com/auth/signup", "_blank");
            } else {
              // For React Native, use Linking
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { Linking } = require("react-native");
              Linking.openURL("https://app.cal.com/auth/signup");
            }
          }}
          disabled={loading}
          className="mb-4 flex items-center justify-center rounded-2xl border border-gray-900 px-6 py-4"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          <View className="flex flex-row items-center justify-center">
            <Text className="text-lg font-semibold text-gray-900">Create an account</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default LoginScreen;
