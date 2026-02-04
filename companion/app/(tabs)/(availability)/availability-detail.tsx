import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Text, useColorScheme } from "react-native";
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
import { getColors } from "@/constants/colors";
import { AppPressable } from "@/components/AppPressable";

// Type for action handlers exposed by AvailabilityDetailScreen
type ActionHandlers = {
  handleSetAsDefault: () => void;
  handleDelete: () => void;
};

export default function AvailabilityDetail() {
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
          title: "",
          headerBackTitle: "", // Hide default back title if it appears
          headerStyle: {
            backgroundColor: isDark ? "black" : "white",
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <HeaderButtonWrapper side="left">
              <AppPressable
                onPress={() => router.back()}
                className="mr-2 h-10 flex-row items-center justify-center rounded-full border border-[#E5E5E5] bg-white px-3 dark:border-[#262626] dark:bg-[#171717]"
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={isDark ? "#FFFFFF" : "#000000"}
                  style={{ marginRight: 4 }}
                />
                <Text className={`text-[15px] font-medium ${isDark ? "text-white" : "text-black"}`}>
                  Availability
                </Text>
              </AppPressable>
            </HeaderButtonWrapper>
          ),
          headerRight: () => (
            <HeaderButtonWrapper side="right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AppPressable className="h-10 flex-row items-center justify-center rounded-full border border-[#E5E5E5] bg-white px-4 dark:border-[#262626] dark:bg-[#171717]">
                    <Text
                      className={`text-[15px] font-medium ${isDark ? "text-white" : "text-black"}`}
                    >
                      Edit
                    </Text>
                  </AppPressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onPress={handleEditNameAndTimezone}>
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color={isDark ? theme.text : "#000"}
                    />
                    <Text className="ml-2 text-[15px] text-black dark:text-white">
                      Name and Timezone
                    </Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleEditWorkingHours}>
                    <Ionicons name="time-outline" size={18} color={isDark ? theme.text : "#000"} />
                    <Text className="ml-2 text-[15px] text-black dark:text-white">
                      Working Hours
                    </Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleEditOverride}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={isDark ? theme.text : "#000"}
                    />
                    <Text className="ml-2 text-[15px] text-black dark:text-white">
                      Date Override
                    </Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onPress={handleSetAsDefault}>
                    <Ionicons name="star-outline" size={18} color={isDark ? theme.text : "#000"} />
                    <Text className="ml-2 text-[15px] text-black dark:text-white">
                      Set as Default
                    </Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onPress={handleDelete} variant="destructive">
                    <Ionicons name="trash-outline" size={18} color={theme.error} />
                    <Text className="ml-2 text-[15px]" style={{ color: theme.error }}>
                      Delete Schedule
                    </Text>
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
