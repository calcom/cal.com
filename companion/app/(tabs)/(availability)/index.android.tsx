import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AvailabilityListItem } from "@/components/availability-list-item/AvailabilityListItem";
import { EmptyScreen } from "@/components/EmptyScreen";
import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import {
  type Schedule,
  useCreateSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
  useSchedules,
  useSetScheduleAsDefault,
} from "@/hooks";
import { CalComAPIService } from "@/services/calcom";
import { offlineAwareRefresh } from "@/utils/network";

// Toast state type
type ToastState = {
  visible: boolean;
  message: string;
  type: "success" | "error";
};

export default function AvailabilityAndroid() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");

  // Inline validation error for create modal
  const [validationError, setValidationError] = useState("");

  // Toast state (fixed position snackbar at bottom)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  // AlertDialog state for delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

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

  // Convert query error to string
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load availability." : null;

  // Function to show toast (snackbar at bottom)
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  // Auto-dismiss toast after 2.5 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ visible: false, message: "", type: "success" });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

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
    setScheduleToDelete(schedule);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!scheduleToDelete) return;

    deleteScheduleMutation(scheduleToDelete.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setScheduleToDelete(null);
        showToast("Schedule deleted");
      },
      onError: () => {
        showToast("Failed to delete schedule", "error");
      },
    });
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

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="alert-circle" size={64} color="#800020" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
            Unable to load availability
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
          <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={() => refetch()}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <EmptyScreen
            icon="time-outline"
            headline="Create an availability schedule"
            description="Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types."
            buttonText="New"
            onButtonPress={handleCreateNew}
          />
        </View>
      </View>
    );
  }

  if (filteredSchedules.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
            placeholder="Search schedules"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-base font-semibold text-white">New</Text>
          </TouchableOpacity>
        </View>
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
    <>
      <Header />
      <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
        <TextInput
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
          placeholder="Search schedules"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
          onPress={handleCreateNew}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-base font-semibold text-white">New</Text>
        </TouchableOpacity>
      </View>

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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              {scheduleToDelete
                ? `This will permanently delete "${scheduleToDelete.name}". This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onPress={() => {
                setShowDeleteDialog(false);
                setScheduleToDelete(null);
              }}
              disabled={isDeleting}
            >
              <UIText>Cancel</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmDelete} disabled={isDeleting}>
              <UIText>Delete</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast Snackbar */}
      {toast.visible && (
        <View
          style={{
            position: "absolute",
            bottom: 100,
            left: 16,
            right: 16,
          }}
          pointerEvents="none"
        >
          <View
            className={`flex-row items-center rounded-lg px-4 py-3 shadow-lg ${
              toast.type === "error" ? "bg-red-600" : "bg-gray-800"
            }`}
          >
            <Ionicons
              name={toast.type === "error" ? "close-circle" : "checkmark-circle"}
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text className="flex-1 text-sm font-medium text-white">{toast.message}</Text>
          </View>
        </View>
      )}
    </>
  );
}
