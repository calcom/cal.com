import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, useColorScheme } from "react-native";
import { AvailabilityListScreen } from "@/components/screens/AvailabilityListScreen";
import { useCreateSchedule, useUserProfile } from "@/hooks";
import { CalComAPIService } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";
import { getAvatarUrl } from "@/utils/getAvatarUrl";

export default function Availability() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { mutate: createScheduleMutation } = useCreateSchedule();
  const { data: userProfile } = useUserProfile();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleCreateNew = () => {
    // Use native iOS Alert.prompt for a native look
    Alert.prompt(
      "Add a new schedule",
      "Create a new availability schedule.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async (name?: string) => {
            if (!name?.trim()) {
              Alert.alert("Error", "Please enter a schedule name");
              return;
            }

            // Get user's timezone (default to America/New_York if not available)
            let userTimezone = "America/New_York";
            try {
              const userProfile = await CalComAPIService.getUserProfile();
              if (userProfile.timeZone) {
                userTimezone = userProfile.timeZone;
              }
            } catch {
              console.log("Could not get user timezone, using default");
            }

            // Create schedule with Monday-Friday 9 AM - 5 PM default
            createScheduleMutation(
              {
                name: name.trim(),
                timeZone: userTimezone,
                isDefault: false,
                availability: [
                  {
                    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    startTime: "09:00",
                    endTime: "17:00",
                  },
                ],
              },
              {
                onSuccess: (newSchedule) => {
                  // Navigate to edit the newly created schedule
                  router.push({
                    pathname: "/(tabs)/(availability)/availability-detail",
                    params: {
                      id: newSchedule.id.toString(),
                    },
                  });
                },
                onError: (error) => {
                  const message = error instanceof Error ? error.message : String(error);
                  console.error("Failed to create schedule", message);
                  if (__DEV__) {
                    const stack = error instanceof Error ? error.stack : undefined;
                    console.debug("[Availability] createSchedule failed", {
                      message,
                      stack,
                    });
                  }
                  showErrorAlert("Error", "Failed to create schedule. Please try again.");
                },
              }
            );
          },
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  return (
    <>
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light"}
        hidden={Platform.OS === "android" || Platform.OS === "web"}
      >
        <Stack.Header.Title large>Availability</Stack.Header.Title>
        <Stack.Header.Right>
          {/* New Menu */}
          <Stack.Header.Menu>
            <Stack.Header.Icon sf="plus" />

            <Stack.Header.MenuAction icon="clock" onPress={handleCreateNew}>
              New Availability
            </Stack.Header.MenuAction>
          </Stack.Header.Menu>

          {/* Profile Button */}
          {userProfile?.avatarUrl ? (
            <Stack.Header.View>
              <Pressable onPress={() => router.push("/profile-sheet")}>
                <Image
                  source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              </Pressable>
            </Stack.Header.View>
          ) : (
            <Stack.Header.Button onPress={() => router.push("/profile-sheet")}>
              <Stack.Header.Icon sf="person.circle.fill" />
            </Stack.Header.Button>
          )}
        </Stack.Header.Right>
        <Stack.Header.SearchBar
          placeholder="Search schedules"
          onChangeText={(e) => setSearchQuery(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor={isDark ? "#000" : "#fff"}
        />
      </Stack.Header>

      <AvailabilityListScreen
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showCreateModal={showCreateModal}
        onShowCreateModalChange={setShowCreateModal}
      />
    </>
  );
}
