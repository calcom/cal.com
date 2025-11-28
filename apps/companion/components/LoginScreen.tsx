import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export function LoginScreen() {
  const { loginWithOAuth, login, loading } = useAuth();
  const [showApiKeyLogin, setShowApiKeyLogin] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

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

  const handleApiKeyLogin = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Error", "Please enter your API key");
      return;
    }

    setApiKeyLoading(true);
    try {
      // For API key login, we use the API key as both access and refresh token
      await login(apiKey.trim(), "");
    } catch (error) {
      console.error("API key login error:", error);
      Alert.alert("Login Failed", "Invalid API key. Please check your API key and try again.", [
        { text: "OK" },
      ]);
    } finally {
      setApiKeyLoading(false);
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

      {!showApiKeyLogin ? (
        <View>
          {/* OAuth Login Section */}
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

          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-gray-300" />
            <Text className="mx-4 text-sm text-gray-500">OR</Text>
            <View className="h-px flex-1 bg-gray-300" />
          </View>

          {/* API Key Option */}
          <TouchableOpacity
            onPress={() => setShowApiKeyLogin(true)}
            className="rounded-lg border border-gray-300 px-6 py-4"
          >
            <Text className="text-center font-semibold text-gray-900">Use API Key Instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* API Key Login Section */}
          <Text className="mb-4 text-lg font-semibold text-gray-900">Enter Your API Key</Text>

          <View className="mb-4">
            <Text className="mb-2 text-sm text-gray-600">
              Get your API key from Settings → Developer → API Keys in your Cal.com dashboard
            </Text>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="cal_live_..."
              secureTextEntry
              className="rounded-lg border border-gray-300 px-4 py-3 text-base"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            onPress={handleApiKeyLogin}
            disabled={apiKeyLoading || !apiKey.trim()}
            className="mb-4 flex-row items-center justify-center rounded-lg bg-gray-900 px-6 py-4"
            style={{ opacity: apiKeyLoading || !apiKey.trim() ? 0.7 : 1 }}
          >
            {apiKeyLoading ? (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            ) : null}
            <Text className="text-lg font-semibold text-white">
              {apiKeyLoading ? "Signing in..." : "Sign in with API Key"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowApiKeyLogin(false);
              setApiKey("");
            }}
            className="py-3"
          >
            <Text className="text-center font-medium text-gray-900">Back to OAuth Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default LoginScreen;
