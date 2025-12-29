import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { Platform, StatusBar, View } from "react-native";
import LoginScreenComponent from "@/components/LoginScreen";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QueryProvider } from "@/contexts/QueryContext";
import "../global.css";

function RootLayoutContent() {
  const { isAuthenticated } = useAuth();

  const content = isAuthenticated ? (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile-sheet"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: Platform.OS === "ios" ? "You" : "Profile",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          // iOS-specific sheet options (ignored on Android)
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.6, 0.9] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable() ? "transparent" : "#FFFFFF",
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : "#FFFFFF",
          },
          headerBlurEffect: Platform.OS === "ios" && isLiquidGlassAvailable() ? undefined : "light",
        }}
      />
    </Stack>
  ) : (
    <LoginScreenComponent />
  );

  const containerClass =
    Platform.OS === "web"
      ? "w-[400px] flex-1 flex-col self-end border-l border-gray-200 bg-white"
      : "bg-white";

  const containerStyle =
    Platform.OS === "web"
      ? {
          width: 400,
          flex: 1,
          display: "flex" as const,
          flexDirection: "column" as const,
        }
      : { flex: 1 };

  return (
    <View
      style={[containerStyle, Platform.OS === "web" && { pointerEvents: "auto" as const }]}
      className={containerClass}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {content}
      <NetworkStatusBanner />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </QueryProvider>
  );
}
