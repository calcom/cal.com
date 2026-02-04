import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useAuth } from "@/contexts";
import { safeLogError } from "@/utils/safeLogger";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const auth = useAuth();

  useEffect(() => {
    if (Platform.OS === "android") {
      if (auth.userInfo) {
        router.replace("/");
      }
    }

    if (Platform.OS !== "web") return;

    // Extract code, state, and error parameters from URL
    const code = params.code as string;
    const state = params.state as string;
    const error = params.error as string;
    const errorDescription = params.error_description as string;

    // Handle OAuth error response
    if (error) {
      const errorMessage = errorDescription || error || "OAuth authorization failed";
      safeLogError("OAuth error occurred", { error, errorDescription });

      if (typeof window !== "undefined") {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_ERROR",
              error: errorMessage,
              errorCode: error,
            },
            "*"
          );
          window.close();
        } else {
          // Store error for main app to pick up
          if (state) {
            window.localStorage.setItem(`oauth_callback_error_${state}`, errorMessage);
            window.localStorage.setItem(`oauth_callback_error_code_${state}`, error);
          }
          router.replace("/");
        }
      }
      return;
    }

    if (code && state) {
      // Store the parameters temporarily using state-specific keys to prevent race conditions
      // The OAuth service should be able to pick these up
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`oauth_callback_code_${state}`, code);
        window.localStorage.setItem(`oauth_callback_state_${state}`, state);

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
          router.replace("/");
        }
      }
    } else {
      safeLogError("No authorization code or state in OAuth callback", { code, state });

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
          router.replace("/");
        }
      }
    }
  }, [params, router, auth.userInfo]);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-lg text-gray-700 dark:text-gray-300">
        Processing OAuth callback...
      </Text>
      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Please wait while we complete the authentication.
      </Text>
    </View>
  );
}
