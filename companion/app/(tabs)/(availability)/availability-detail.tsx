import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Text, TouchableOpacity } from "react-native";
import {
  AvailabilityDetailScreen,
  type AvailabilityDetailScreenHandle,
} from "@/components/screens/AvailabilityDetailScreen";
import { HeaderButtonWrapper } from "@/components/HeaderButtonWrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type for action handlers exposed by AvailabilityDetailScreen
type ActionHandlers = {
  handleSetAsDefault: () => void;
  handleDelete: () => void;
};

export default function AvailabilityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Ref to store action handlers from AvailabilityDetailScreen
  const actionHandlersRef = useRef<ActionHandlers | null>(null);
  const screenRef = useRef<AvailabilityDetailScreenHandle>(null);

  // Callback to receive action handlers from AvailabilityDetailScreen
  const handleActionsReady = useCallback((handlers: ActionHandlers) => {
    actionHandlersRef.current = handlers;
  }, []);

  // Navigation handlers for edit modal screens
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
          headerStyle: {
            backgroundColor: "#f2f2f7",
          },
          headerShadowVisible: false,
          headerRight: () => (
            <HeaderButtonWrapper side="right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TouchableOpacity
                    style={{
                      padding: 8,
                      marginRight: -8,
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal-circle" size={24} color="#000000" />
                  </TouchableOpacity>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onPress={handleEditNameAndTimezone}>
                    <Ionicons name="pencil-outline" size={18} color="#000" />
                    <Text className="ml-2 text-[15px] text-black">Name and Timezone</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleEditWorkingHours}>
                    <Ionicons name="time-outline" size={18} color="#000" />
                    <Text className="ml-2 text-[15px] text-black">Working Hours</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleEditOverride}>
                    <Ionicons name="calendar-outline" size={18} color="#000" />
                    <Text className="ml-2 text-[15px] text-black">Date Override</Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onPress={handleSetAsDefault}>
                    <Ionicons name="star-outline" size={18} color="#000" />
                    <Text className="ml-2 text-[15px] text-black">Set as Default</Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onPress={handleDelete} variant="destructive">
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <Text className="ml-2 text-[15px] text-[#FF3B30]">Delete Schedule</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </HeaderButtonWrapper>
          ),
        }}
      />

      <AvailabilityDetailScreen ref={screenRef} id={id} onActionsReady={handleActionsReady} />
    </>
  );
}
