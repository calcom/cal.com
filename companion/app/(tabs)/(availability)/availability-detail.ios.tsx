import { useColorScheme } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import {
  AvailabilityDetailScreen,
  type AvailabilityDetailScreenHandle,
} from "@/components/screens/AvailabilityDetailScreen";
import { getColors } from "@/constants/colors";

// Type for action handlers exposed by AvailabilityDetailScreen.ios.tsx
type ActionHandlers = {
  handleSetAsDefault: () => void;
  handleDelete: () => void;
};

export default function AvailabilityDetailIOS() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  // Ref to store action handlers from AvailabilityDetailScreen
  const actionHandlersRef = useRef<ActionHandlers | null>(null);
  const screenRef = useRef<AvailabilityDetailScreenHandle>(null);

  // Callback to receive action handlers from AvailabilityDetailScreen
  const handleActionsReady = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = handlers;
  }, []);

  // Navigation handlers for edit bottom sheets
  const handleEditNameAndTimezone = useCallback(() => {
    router.push(`/edit-availability-name?id=${id}` as never);
  }, [router, id]);

  const handleEditWorkingHours = useCallback(() => {
    router.push(`/edit-availability-hours?id=${id}` as never);
  }, [router, id]);

  const handleEditOverride = useCallback(() => {
    router.push(`/edit-availability-override?id=${id}` as never);
  }, [router, id]);

  // Action handlers for inline actions
  const handleSetAsDefault = useCallback(() => {
    if (actionHandlersRef.current?.handleSetAsDefault) {
      actionHandlersRef.current.handleSetAsDefault();
    } else if (screenRef.current?.setAsDefault) {
      screenRef.current.setAsDefault();
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (actionHandlersRef.current?.handleDelete) {
      actionHandlersRef.current.handleDelete();
    } else if (screenRef.current?.delete) {
      screenRef.current.delete();
    }
  }, []);

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Availability",
          headerBackTitle: "Availability",
          headerBackButtonDisplayMode: "default",
          headerTitle: "",
          headerStyle: {
            backgroundColor: isDark ? theme.background : theme.backgroundMuted,
          },
          headerShadowVisible: false,
        }}
      />

      <Stack.Header
        style={{
          shadowColor: "transparent",
          backgroundColor: isDark ? theme.background : theme.backgroundMuted,
        }}
      >
        <Stack.Header.Right>
          {/* Edit Menu */}
          <Stack.Header.Menu>
            <Stack.Header.Label>Edit</Stack.Header.Label>

            {/* Name and Timezone */}
            <Stack.Header.MenuAction icon="pencil" onPress={handleEditNameAndTimezone}>
              Name and Timezone
            </Stack.Header.MenuAction>

            {/* Working Hours */}
            <Stack.Header.MenuAction icon="clock" onPress={handleEditWorkingHours}>
              Working Hours
            </Stack.Header.MenuAction>

            {/* Date Override */}
            <Stack.Header.MenuAction icon="calendar.badge.plus" onPress={handleEditOverride}>
              Date Override
            </Stack.Header.MenuAction>

            {/* Set as Default */}
            <Stack.Header.MenuAction icon="star" onPress={handleSetAsDefault}>
              Set as Default
            </Stack.Header.MenuAction>

            {/* Delete */}
            <Stack.Header.MenuAction icon="trash" onPress={handleDelete} destructive>
              Delete Schedule
            </Stack.Header.MenuAction>
          </Stack.Header.Menu>
        </Stack.Header.Right>
      </Stack.Header>

      <AvailabilityDetailScreen ref={screenRef} id={id} onActionsReady={handleActionsReady} />
    </>
  );
}
