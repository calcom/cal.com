import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { AvailabilityListScreen } from "@/components/screens/AvailabilityListScreen";

export default function Availability() {
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
          <Stack.Header.Button onPress={handleCreateNew} tintColor="#000" variant="prominent">
            New
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
