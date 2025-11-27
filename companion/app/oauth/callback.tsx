import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Extract code and state from URL parameters
    const code = params.code as string;
    const state = params.state as string;

    if (code) {
      // Store the parameters temporarily and redirect back to main app
      // The OAuth service should be able to pick these up
      if (typeof window !== "undefined") {
        window.localStorage.setItem("oauth_callback_code", code);
        if (state) {
          window.localStorage.setItem("oauth_callback_state", state);
        }

        // Close the OAuth popup/tab if it exists
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_SUCCESS",
              code,
              state,
            },
            "*"
          );
          window.close();
        } else {
          // Redirect to main app
          router.replace("/(tabs)");
        }
      }
    } else {
      console.error("No authorization code in OAuth callback");

      // Handle error case
      if (typeof window !== "undefined") {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_ERROR",
              error: "No authorization code received",
            },
            "*"
          );
          window.close();
        } else {
          router.replace("/(tabs)");
        }
      }
    }
  }, [params, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-lg text-gray-700">Processing OAuth callback...</Text>
      <Text className="mt-2 text-sm text-gray-500">
        Please wait while we complete the authentication.
      </Text>
    </View>
  );
}
