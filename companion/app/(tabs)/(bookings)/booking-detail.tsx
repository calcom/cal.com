import { BookingDetailScreen } from "../../../components/screens/BookingDetailScreen";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert } from "react-native";

export default function BookingDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();

  if (!uid) {
    return null;
  }

  // Define booking actions organized by sections
  const bookingActionsSections = {
    editEvent: [
      {
        id: "reschedule",
        label: "Reschedule Booking",
        icon: "calendar",
        onPress: () => Alert.alert("Reschedule", "Reschedule functionality coming soon"),
      },
      {
        id: "edit-location",
        label: "Edit Location",
        icon: "location",
        onPress: () => Alert.alert("Edit Location", "Edit location functionality coming soon"),
      },
      {
        id: "add-guests",
        label: "Add Guests",
        icon: "person.badge.plus",
        onPress: () => Alert.alert("Add Guests", "Add guests functionality coming soon"),
      },
    ],
    afterEvent: [
      {
        id: "view-recordings",
        label: "View Recordings",
        icon: "video",
        onPress: () => Alert.alert("View Recordings", "View recordings functionality coming soon"),
      },
      {
        id: "session-details",
        label: "Meeting Session Details",
        icon: "info.circle",
        onPress: () =>
          Alert.alert("Session Details", "Meeting session details functionality coming soon"),
      },
      {
        id: "mark-no-show",
        label: "Mark as No-Show",
        icon: "eye.slash",
        onPress: () => Alert.alert("Mark No-Show", "Mark as no-show functionality coming soon"),
      },
    ],
    standalone: [
      {
        id: "report",
        label: "Report Booking",
        icon: "flag",
        onPress: () => Alert.alert("Report", "Report booking functionality coming soon"),
        destructive: true,
      },
      {
        id: "cancel",
        label: "Cancel Event",
        icon: "xmark.circle",
        onPress: () => Alert.alert("Cancel Event", "Cancel event functionality coming soon"),
        destructive: true,
      },
    ],
  } as const;

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
            <Stack.Header.Label>Actions</Stack.Header.Label>
            <Stack.Header.Icon sf="ellipsis" />

            {/* Edit Event Section */}
            <Stack.Header.Menu inline title="Edit Event">
              {bookingActionsSections.editEvent.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>

            {/* After Event Section */}
            <Stack.Header.Menu inline title="After Event">
              {bookingActionsSections.afterEvent.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>

            {/* Danger Zone Submenu */}
            <Stack.Header.Menu inline title="Danger Zone">
              {bookingActionsSections.standalone.map((action) => (
                <Stack.Header.MenuAction
                  key={action.id}
                  icon={action.icon}
                  onPress={action.onPress}
                  destructive
                >
                  {action.label}
                </Stack.Header.MenuAction>
              ))}
            </Stack.Header.Menu>
          </Stack.Header.Menu>
        </Stack.Header.Right>
      </Stack.Header>

      <BookingDetailScreen uid={uid} />
    </>
  );
}
