import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, TextInput, View } from "react-native";
import { AvailabilityListItem } from "@/components/availability-list-item/AvailabilityListItem";
import { EmptyScreen } from "@/components/EmptyScreen";
import { Header } from "@/components/Header";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { SearchHeader } from "@/components/SearchHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Text as UIText } from "@/components/ui/text";
import { Toast } from "@/components/ui/toast";
import {
  type Schedule,
  useCreateSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
  useSchedules,
  useSetScheduleAsDefault,
  useToast,
} from "@/hooks";
import { CalComAPIService } from "@/services/calcom";
import { getDisplayError } from "@/utils/error";
import { offlineAwareRefresh } from "@/utils/network";

export default function AvailabilityAndroid() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");

  // Inline validation error for create modal
  const [validationError, setValidationError] = useState("");

  // Toast state management
  const { toast, showToast } = useToast();

  // Note: Delete confirmation uses native Alert.alert() on Android

  // Use React Query hooks
  const {
    data: schedules = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useSchedules();

  // Show refresh indicator when fetching
  const refreshing = isFetching && !loading;

  const { mutate: createScheduleMutation, isPending: creating } = useCreateSchedule();
  const { mutate: deleteScheduleMutation, isPending: isDeleting } = useDeleteSchedule();
  const { mutate: duplicateScheduleMutation } = useDuplicateSchedule();
  const { mutate: setAsDefaultMutation } = useSetScheduleAsDefault();

  // Convert query error to user-friendly message
  const error = getDisplayError(queryError, "availability");

  // Handle pull-to-refresh (offline-aware)
  const onRefresh = () => offlineAwareRefresh(refetch);

  // Filter schedules based on search query
  const filteredSchedules = useMemo(() => {
    if (searchQuery.trim() === "") {
      return schedules;
    }
    const searchLower = searchQuery.toLowerCase();
    return schedules.filter((schedule) => schedule.name.toLowerCase().includes(searchLower));
  }, [schedules, searchQuery]);

  const handleSchedulePress = (schedule: Schedule) => {
    router.push({
      pathname: "/availability-detail",
      params: { id: schedule.id.toString() },
    });
  };

  const handleScheduleLongPress = (_schedule: Schedule) => {
    // Android handles long-press via DropdownMenu in AvailabilityListItem.android.tsx
    return;
  };

  const handleSetAsDefault = (schedule: Schedule) => {
    setAsDefaultMutation(schedule.id, {
      onSuccess: () => {
        showToast("Schedule set as default");
      },
      onError: () => {
        showToast("Failed to set schedule as default", "error");
      },
    });
  };

  const handleDuplicate = (schedule: Schedule) => {
    duplicateScheduleMutation(schedule.id, {
      onSuccess: () => {
        showToast("Schedule duplicated");
      },
      onError: () => {
        showToast("Failed to duplicate schedule", "error");
      },
    });
  };

  const handleDelete = (schedule: Schedule) => {
    Alert.alert(
      "Delete Schedule",
      `This will permanently delete "${schedule.name}". This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteScheduleMutation(schedule.id, {
              onSuccess: () => {
                showToast("Schedule deleted");
              },
              onError: () => {
                showToast("Failed to delete schedule", "error");
              },
            });
          },
        },
      ]
    );
  };

  const handleCreateNew = () => {
    setNewScheduleName("");
    setValidationError("");
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewScheduleName("");
    setValidationError("");
  };

  const handleCreateSchedule = async () => {
    // Clear previous error
    setValidationError("");

    if (!newScheduleName.trim()) {
      setValidationError("Please enter a schedule name");
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
        name: newScheduleName.trim(),
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
          handleCloseCreateModal();
          showToast("Schedule created");

          // Navigate to edit the newly created schedule
          router.push({
            pathname: "/availability-detail",
            params: {
              id: newSchedule.id.toString(),
            },
          });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Failed to create schedule", message);
          if (__DEV__) {
            const stack = err instanceof Error ? err.stack : undefined;
            console.debug("[AvailabilityAndroid] createSchedule failed", {
              message,
              stack,
            });
          }
          showToast("Failed to create schedule", "error");
        },
      }
    );
  };

  // Clear validation error when name changes
  const handleNameChange = (text: string) => {
    setNewScheduleName(text);
    if (validationError) {
      setValidationError("");
    }
  };

  // Handle search empty state
  if (filteredSchedules.length === 0 && searchQuery.trim() !== "" && !loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search schedules"
          onNewPress={handleCreateNew}
        />
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <EmptyScreen
            icon="search-outline"
            headline={`No results found for "${searchQuery}"`}
            description="Try searching with different keywords"
          />
        </View>
      </View>
    );
  }

  return (
    <ScreenWrapper
      loading={loading}
      error={error}
      onRetry={refetch}
      errorTitle="Unable to load availability"
      isEmpty={schedules.length === 0}
      emptyProps={{
        icon: "time-outline",
        headline: "Create an availability schedule",
        description:
          "Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types.",
        buttonText: "New",
        onButtonPress: handleCreateNew,
      }}
    >
      <Header />
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search schedules"
        onNewPress={handleCreateNew}
      />

      <View className="flex-1 px-2 pt-4 md:px-4">
        <View className="flex-1 overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
          <FlatList
            data={filteredSchedules}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <AvailabilityListItem
                item={item}
                index={index}
                handleSchedulePress={handleSchedulePress}
                handleScheduleLongPress={handleScheduleLongPress}
                setSelectedSchedule={() => {}}
                setShowActionsModal={() => {}}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onSetAsDefault={handleSetAsDefault}
              />
            )}
            contentContainerStyle={{ paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Create Schedule AlertDialog */}
      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a new schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new availability schedule for your event types.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Name Input */}
          <View className="px-1">
            <Text className="mb-2 text-sm font-medium text-gray-700">Name</Text>
            <TextInput
              className={`rounded-md border bg-white px-3 py-2.5 text-base text-gray-900 ${
                validationError ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Working Hours"
              placeholderTextColor="#9CA3AF"
              value={newScheduleName}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateSchedule}
            />
            {validationError ? (
              <Text className="mt-1.5 text-sm text-red-500">{validationError}</Text>
            ) : null}
          </View>

          <AlertDialogFooter>
            <AlertDialogCancel onPress={handleCloseCreateModal} disabled={creating}>
              <UIText>Cancel</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleCreateSchedule} disabled={creating}>
              <UIText>Continue</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast Snackbar */}
      <Toast {...toast} />
    </ScreenWrapper>
  );
}
