import { AvailabilityDetailScreen } from "../components/screens/AvailabilityDetailScreen";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import React from "react";
import { TouchableOpacity, Text } from "react-native";

export default function AvailabilityDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Edit Availability</Text>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <AvailabilityDetailScreen id={id} />
    </>
  );
}
