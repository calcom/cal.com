import { BookingDetailScreen } from "../../../components/screens/BookingDetailScreen";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

export default function BookingDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();

  if (!uid) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <Stack.Header style={{ shadowColor: "transparent" }}>
        <Stack.Header.Title>Booking Details</Stack.Header.Title>

        {/* Header right and left API only works on iOS ATM see: https://docs.expo.dev/versions/unversioned/sdk/router/#stackheaderright */}
        <Stack.Header.Right>
          <Stack.Header.Menu>
            <Stack.Header.Label>Menu</Stack.Header.Label>
            <Stack.Header.Icon sf="ellipsis" />
            <Stack.Header.MenuAction onPress={() => {}}>Action 1</Stack.Header.MenuAction>
            <Stack.Header.MenuAction isOn icon="star.fill">
              Action 2
            </Stack.Header.MenuAction>
            <Stack.Header.Menu inline>
              <Stack.Header.MenuAction isOn>Sub Action</Stack.Header.MenuAction>
            </Stack.Header.Menu>
          </Stack.Header.Menu>
        </Stack.Header.Right>
      </Stack.Header>

      <BookingDetailScreen uid={uid} />
    </>
  );
}
