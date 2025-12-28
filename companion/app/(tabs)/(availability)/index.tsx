import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { AvailabilityListScreen } from "@/components/screens/AvailabilityListScreen";

export default function Availability() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateNew = () => {
    setShowCreateModal(true);
  };

  return (
    <>
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"}
        hidden={Platform.OS === "android"}
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
          <Stack.Header.Button onPress={() => router.push("/profile-sheet")}>
            <Stack.Header.Icon sf="person.circle.fill" />
          </Stack.Header.Button>
        </Stack.Header.Right>
        <Stack.Header.SearchBar
          placeholder="Search schedules"
          onChangeText={(e) => setSearchQuery(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor="#fff"
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
