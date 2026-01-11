import { Stack } from "expo-router";
import { Platform, View, StatusBar } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { QueryProvider } from "../contexts/QueryContext";
import { NetworkStatusBanner } from "../components/NetworkStatusBanner";
import LoginScreen from "../components/LoginScreen";
import "../global.css";

function RootLayoutContent() {
  const { isAuthenticated } = useAuth();

  const content = isAuthenticated ? (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  ) : (
    <LoginScreen />
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
