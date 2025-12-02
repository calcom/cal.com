import React from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";

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
    <View className="flex-1 justify-center bg-white px-6">
      <View className="mb-8">
        <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
          Welcome to Cal.com Companion
        </Text>
        <Text className="text-center text-gray-600">
          Sign in to manage your bookings and event types
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleOAuthLogin}
        disabled={loading}
        className="mb-4 flex-row items-center justify-center rounded-lg bg-gray-900 px-6 py-4"
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <ActivityIndicator size="small" color="white" className="mr-2" /> : null}
        <Text className="text-lg font-semibold text-white">
          {loading ? "Signing in..." : "Sign in with Cal.com"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default LoginScreen;
