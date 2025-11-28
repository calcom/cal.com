import { Stack } from "expo-router";
import { Platform, View, StatusBar } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import LoginScreen from "../components/LoginScreen";
import "../global.css";

function RootLayoutContent() {
  const { isAuthenticated } = useAuth();

  const stackContent = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    const loginContent = <LoginScreen />;

    return Platform.OS === "web" ? (
      <View
        style={{
          width: 400,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
        }}
        className="w-[400px] flex-1 flex-col self-end border-l border-gray-200 bg-white"
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {loginContent}
      </View>
    ) : (
      <View style={{ flex: 1 }} className="bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {loginContent}
      </View>
    );
  }

  // Show authenticated app content
  return Platform.OS === "web" ? (
    <View
      style={{
        width: 400,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
      }}
      className="w-[400px] flex-1 flex-col self-end border-l border-gray-200 bg-white"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  ) : (
    <View style={{ flex: 1 }} className="bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {stackContent}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
