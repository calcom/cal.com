import { PortalHost } from "@rn-primitives/portal";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { Platform, StatusBar, View } from "react-native";
import LoginScreenComponent from "@/components/LoginScreen";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { GlobalToast } from "@/components/ui/GlobalToast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QueryProvider } from "@/contexts/QueryContext";
import { ToastProvider } from "@/contexts/ToastContext";
import "../global.css";

function RootLayoutContent() {
  const { isAuthenticated } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    secondaryBackground: isDark ? "#1C1C1E" : "#F2F2F7",
    border: isDark ? "#38383A" : "#C6C6C8",
  };

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
              Platform.OS === "ios" && isLiquidGlassAvailable() ? "transparent" : colors.background,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.background,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="meeting-session-details"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Session Details",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          // iOS-specific sheet options (ignored on Android)
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.7, 0.9] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="edit-location"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Edit Location",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.5, 0.7] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="mark-no-show"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Mark No-Show",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.4, 0.6] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="view-recordings"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Recordings",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.7, 0.9] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="add-guests"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Add Guests",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.6, 0.8] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="reschedule"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Reschedule",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.8, 0.95] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="edit-availability-name"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Edit Name & Timezone",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.5, 0.7] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="edit-availability-hours"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Working Hours",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.7, 1] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="edit-availability-day"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Edit Day",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.6, 0.9] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
      <Stack.Screen
        name="edit-availability-override"
        options={{
          headerShown: true,
          headerTransparent: Platform.OS === "ios",
          headerLargeTitle: false,
          title: "Date Override",
          presentation:
            Platform.OS === "ios"
              ? isLiquidGlassAvailable()
                ? "formSheet"
                : "modal"
              : "containedModal",
          sheetGrabberVisible: Platform.OS === "ios",
          sheetAllowedDetents: Platform.OS === "ios" ? [0.7, 0.9] : undefined,
          sheetInitialDetentIndex: Platform.OS === "ios" ? 0 : undefined,
          contentStyle: {
            backgroundColor:
              Platform.OS === "ios" && isLiquidGlassAvailable()
                ? "transparent"
                : colors.secondaryBackground,
          },
          headerStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.secondaryBackground,
          },
          headerBlurEffect:
            Platform.OS === "ios" && isLiquidGlassAvailable()
              ? undefined
              : isDark
                ? "dark"
                : "light",
        }}
      />
    </Stack>
  ) : (
    <LoginScreenComponent />
  );

  const containerClass =
    Platform.OS === "web"
      ? "w-[400px] flex-1 flex-col self-end border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
      : "bg-white dark:bg-black";

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
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      {content}
      <NetworkStatusBanner />
      <PortalHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <RootLayoutContent />
          <GlobalToast />
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
