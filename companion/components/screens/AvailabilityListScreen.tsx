import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Activity, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { AppPressable } from "@/components/AppPressable";
import { AvailabilityListItem } from "@/components/availability-list-item/AvailabilityListItem";
import { AvailabilityListSkeleton } from "@/components/availability-list-item/AvailabilityListItemSkeleton";
import { EmptyScreen } from "@/components/EmptyScreen";
import { FullScreenModal } from "@/components/FullScreenModal";
import { Header } from "@/components/Header";
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
import { Text as AlertDialogText } from "@/components/ui/text";
import {
  useCreateSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
  useSchedules,
  useSetScheduleAsDefault,
} from "@/hooks";
import { CalComAPIService, type Schedule } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { offlineAwareRefresh } from "@/utils/network";
import { getColors } from "@/constants/colors";

export interface AvailabilityListScreenProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showCreateModal: boolean;
  onShowCreateModalChange: (show: boolean) => void;
}

export function AvailabilityListScreen({
  searchQuery,
  onSearchChange,
  showCreateModal,
  onShowCreateModalChange,
}: AvailabilityListScreenProps) {
  const router = useRouter();
  const [newScheduleName, setNewScheduleName] = useState("");
  const [nameError, setNameError] = useState("");
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  const colors = {
    background: isDark ? "#000000" : "#FFFFFF",
    backgroundSecondary: isDark ? "#171717" : "#f8f9fa",
    border: isDark ? "#4D4D4D" : "#E5E5EA",
    text: isDark ? "#FFFFFF" : "#333333",
    textSecondary: isDark ? "#A3A3A3" : "#666666",
  };

  // Use React Query hooks
  const { data: schedules = [], isLoading: loading, error: queryError, refetch } = useSchedules();

  const { mutate: createScheduleMutation, isPending: creating } = useCreateSchedule();
  const { mutate: deleteScheduleMutation, isPending: deleting } = useDeleteSchedule();
  const { mutate: duplicateScheduleMutation } = useDuplicateSchedule();
  const { mutate: setAsDefaultMutation } = useSetScheduleAsDefault();

  // Convert query error to string
  // Don't show error UI for authentication errors (user will be redirected to login)
  // Only show error UI in development mode for other errors
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load availability." : null;

  // Filter schedules based on search query
  const filteredSchedules = useMemo(() => {
    if (searchQuery.trim() === "") {
      return schedules;
    }
    const searchLower = searchQuery.toLowerCase();
    return schedules.filter((schedule) => schedule.name.toLowerCase().includes(searchLower));
  }, [schedules, searchQuery]);

  // Note: We don't use useFocusEffect here because schedules have Infinity stale time.
  // Data only refreshes on mutations (create/update/delete) or manual pull-to-refresh.

  // Handle pull-to-refresh (offline-aware)
  const onRefresh = async () => {
    setIsManualRefreshing(true);
    await offlineAwareRefresh(refetch).finally(() => {
      setIsManualRefreshing(false);
    });
  };

  const handleSearch = (query: string) => {
    onSearchChange(query);
  };

  const handleSetAsDefault = (schedule: Schedule) => {
    setAsDefaultMutation(schedule.id, {
      onSuccess: () => {
        showSuccessAlert("Success", "Schedule set as default");
      },
      onError: () => {
        showErrorAlert("Error", "Failed to set schedule as default. Please try again.");
      },
    });
  };

  const handleDuplicate = (schedule: Schedule) => {
    duplicateScheduleMutation(schedule.id, {
      onSuccess: () => {
        showSuccessAlert("Success", "Schedule duplicated successfully");
      },
      onError: () => {
        showErrorAlert("Error", "Failed to duplicate schedule. Please try again.");
      },
    });
  };

  const handleDelete = (schedule: Schedule) => {
    if (Platform.OS === "web") {
      // Use custom modal for web - must set selectedSchedule first!
      setSelectedSchedule(schedule);
      setShowDeleteModal(true);
    } else {
      // Use native Alert for iOS/Android
      Alert.alert("Delete Schedule", `Are you sure you want to delete "${schedule.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteScheduleMutation(schedule.id, {
              onSuccess: () => {
                showSuccessAlert("Success", "Schedule deleted successfully");
              },
              onError: () => {
                showErrorAlert("Error", "Failed to delete schedule. Please try again.");
              },
            });
          },
        },
      ]);
    }
  };

  const confirmDelete = () => {
    if (!selectedSchedule) return;

    deleteScheduleMutation(selectedSchedule.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        setSelectedSchedule(null);
        showSuccessAlert("Success", "Schedule deleted successfully");
      },
      onError: () => {
        showErrorAlert("Error", "Failed to delete schedule. Please try again.");
      },
    });
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push({
      pathname: "/(tabs)/(availability)/availability-detail",
      params: { id: schedule.id.toString() },
    });
  };

  const handleCreateNew = () => {
    setNewScheduleName("");
    setNameError("");
    onShowCreateModalChange(true);
  };

  const handleCreateSchedule = async () => {
    // Clear previous error
    setNameError("");

    if (!newScheduleName.trim()) {
      // Use inline error for Android AlertDialog, showErrorAlert for others
      if (Platform.OS === "android") {
        setNameError("Please enter a schedule name");
      } else {
        showErrorAlert("Error", "Please enter a schedule name");
      }
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
          onShowCreateModalChange(false);
          setNewScheduleName("");

          // Navigate to edit the newly created schedule
          router.push({
            pathname: "/(tabs)/(availability)/availability-detail",
            params: {
              id: newSchedule.id.toString(),
            },
          });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Failed to create schedule", message);
          if (__DEV__) {
            const stack = error instanceof Error ? error.stack : undefined;
            console.debug("[AvailabilityListScreen] createSchedule failed", {
              message,
              stack,
            });
          }
          showErrorAlert("Error", "Failed to create schedule. Please try again.");
        },
      }
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <Header />
        <View className="flex-1 px-2 pt-4 md:px-4">
          <AvailabilityListSkeleton iosStyle={Platform.OS === "ios"} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
        <Header />
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle" size={64} color={theme.destructive} />
          <Text style={{ color: colors.text }} className="mb-2 mt-4 text-center text-xl font-bold">
            Unable to load availability
          </Text>
          <Text style={{ color: colors.textSecondary }} className="mb-6 text-center text-base">
            {error}
          </Text>
          <AppPressable
            className="rounded-lg bg-black px-6 py-3 dark:bg-white"
            onPress={() => refetch()}
          >
            <Text className="text-base font-semibold text-white dark:text-black">Retry</Text>
          </AppPressable>
        </View>
      </View>
    );
  }

  // Determine what content to show
  const showEmptyState = schedules.length === 0 && !loading;
  const showSearchEmptyState =
    filteredSchedules.length === 0 && searchQuery.trim() !== "" && !showEmptyState;
  const showList = !showEmptyState && !showSearchEmptyState;

  return (
    <>
      {/* Non-iOS header with search */}
      <Activity mode={Platform.OS !== "ios" ? "visible" : "hidden"}>
        <Header />
        <View
          style={{
            backgroundColor: isDark ? "#000000" : "#f3f4f6",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
          className="flex-row items-center gap-3 px-4 py-2"
        >
          <TextInput
            style={{
              backgroundColor: isDark ? "#171717" : "#FFFFFF",
              borderColor: colors.border,
              color: colors.text,
            }}
            className="flex-1 rounded-lg border px-3 py-2 text-[17px]"
            placeholder="Search schedules"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2 dark:bg-white"
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={18} color={isDark ? "#000" : "#fff"} />
            <Text className="text-base font-semibold text-white dark:text-black">New</Text>
          </TouchableOpacity>
        </View>
      </Activity>

      {/* Empty state - no schedules */}
      <Activity mode={showEmptyState ? "visible" : "hidden"}>
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            paddingBottom: 90,
          }}
          refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={onRefresh} />}
          contentInsetAdjustmentBehavior="automatic"
        >
          <EmptyScreen
            icon="time-outline"
            headline="Create an availability schedule"
            description="Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types."
            buttonText="New"
            onButtonPress={handleCreateNew}
          />
        </ScrollView>
      </Activity>

      {/* Search bar and content for non-empty states */}
      <Activity mode={!showEmptyState ? "visible" : "hidden"}>
        {/* Search empty state */}
        <Activity mode={showSearchEmptyState ? "visible" : "hidden"}>
          <ScrollView
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              paddingBottom: 90,
            }}
            refreshControl={
              <RefreshControl refreshing={isManualRefreshing} onRefresh={onRefresh} />
            }
          >
            <EmptyScreen
              icon="search-outline"
              headline={`No results found for "${searchQuery}"`}
              description="Try searching with different keywords"
            />
          </ScrollView>
        </Activity>

        {/* Schedules list */}
        <Activity mode={showList ? "visible" : "hidden"}>
          {isManualRefreshing ? (
            <AvailabilityListSkeleton iosStyle={Platform.OS === "ios"} />
          ) : (
            <FlatList
              style={{
                flex: 1,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
              }}
              contentContainerStyle={{
                paddingBottom: 90,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
              data={filteredSchedules}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <AvailabilityListItem
                  item={item}
                  index={index}
                  handleSchedulePress={handleSchedulePress}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onSetAsDefault={handleSetAsDefault}
                />
              )}
              refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
            />
          )}
        </Activity>
      </Activity>

      {/* Create Schedule Modal - Android uses AlertDialog */}
      {Platform.OS === "android" ? (
        <AlertDialog open={showCreateModal} onOpenChange={onShowCreateModalChange}>
          <AlertDialogContent>
            <AlertDialogHeader className="items-start">
              <AlertDialogTitle>
                <AlertDialogText className="text-left text-lg font-semibold">
                  Add a new schedule
                </AlertDialogText>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <AlertDialogText className="text-left text-sm text-muted-foreground">
                  Create a new availability schedule.
                </AlertDialogText>
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Name Input */}
            <View>
              <AlertDialogText className="mb-2 text-sm font-medium">Name</AlertDialogText>
              <TextInput
                className={`rounded-md border bg-white px-3 py-2.5 text-base text-gray-900 ${
                  nameError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Working Hours"
                placeholderTextColor="#9CA3AF"
                value={newScheduleName}
                onChangeText={(text) => {
                  setNewScheduleName(text);
                  if (nameError) setNameError("");
                }}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreateSchedule}
              />
              {nameError ? (
                <AlertDialogText className="mt-1 text-sm text-red-500">{nameError}</AlertDialogText>
              ) : null}
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel
                onPress={() => {
                  onShowCreateModalChange(false);
                  setNewScheduleName("");
                  setNameError("");
                }}
                disabled={creating}
              >
                <AlertDialogText>Cancel</AlertDialogText>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleCreateSchedule} disabled={creating}>
                <AlertDialogText className="text-white">Continue</AlertDialogText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <FullScreenModal
          visible={showCreateModal}
          animationType="fade"
          onRequestClose={() => onShowCreateModalChange(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <TouchableOpacity
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#171717]"
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="p-6 pb-2">
                <Text className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  Add a new schedule
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#A3A3A3]">
                  Create a new availability schedule.
                </Text>
              </View>

              {/* Content */}
              <View className="px-6 pb-4">
                <View className="mb-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#A3A3A3]">
                    Name
                  </Text>
                  <TextInput
                    className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-[#4D4D4D] dark:bg-[#262626] dark:text-white"
                    placeholder="Working Hours"
                    placeholderTextColor="#9CA3AF"
                    value={newScheduleName}
                    onChangeText={setNewScheduleName}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateSchedule}
                  />
                  {nameError ? (
                    <Text className="mt-1 text-sm text-red-500">{nameError}</Text>
                  ) : null}
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row-reverse gap-2 px-6 pb-6 pt-2">
                <TouchableOpacity
                  className={`rounded-lg px-4 py-2.5 ${creating ? "opacity-50" : ""}`}
                  style={{ backgroundColor: "#111827" }}
                  onPress={handleCreateSchedule}
                  disabled={creating}
                >
                  <Text className="text-center text-base font-medium text-white">Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 dark:border-[#4D4D4D] dark:bg-[#262626]"
                  onPress={() => {
                    onShowCreateModalChange(false);
                    setNewScheduleName("");
                  }}
                  disabled={creating}
                >
                  <Text className="text-center text-base font-medium text-gray-700 dark:text-white">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </FullScreenModal>
      )}

      {/* Schedule Actions Modal */}
      <FullScreenModal
        visible={showActionsModal}
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <AppPressable
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <AppPressable
            className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[#171717]"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6 dark:border-[#4D4D4D]">
              <Text className="text-center text-xl font-semibold text-gray-900 dark:text-white">
                Schedule Actions
              </Text>
            </View>

            {/* Actions List */}
            <View className="p-2">
              {/* Set as Default - only show if not already default */}
              <Activity
                mode={selectedSchedule && !selectedSchedule.isDefault ? "visible" : "hidden"}
              >
                <AppPressable
                  onPress={() => {
                    setShowActionsModal(false);
                    if (selectedSchedule) {
                      handleSetAsDefault(selectedSchedule);
                    }
                  }}
                  className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#262626] md:p-4"
                >
                  <Ionicons name="star-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-base text-gray-900 dark:text-white">
                    Set as Default
                  </Text>
                </AppPressable>

                <View className="mx-4 my-2 h-px bg-gray-200 dark:bg-[#4D4D4D]" />
              </Activity>

              {/* Duplicate */}
              <AppPressable
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    setTimeout(() => {
                      handleDuplicate(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#262626] md:p-4"
              >
                <Ionicons name="copy-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900 dark:text-white">Duplicate</Text>
              </AppPressable>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200 dark:bg-[#4D4D4D]" />

              {/* Delete */}
              <AppPressable
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    // Small delay to ensure modal closes before alert shows
                    setTimeout(() => {
                      handleDelete(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#262626] md:p-4"
              >
                <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                <Text className="ml-3 text-base" style={{ color: theme.destructive }}>
                  Delete
                </Text>
              </AppPressable>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 dark:border-[#4D4D4D] md:p-4">
              <AppPressable
                className="w-full rounded-lg bg-gray-100 p-3 dark:bg-[#262626]"
                onPress={() => setShowActionsModal(false)}
              >
                <Text className="text-center text-base font-medium text-gray-700 dark:text-white">
                  Cancel
                </Text>
              </AppPressable>
            </View>
          </AppPressable>
        </AppPressable>
      </FullScreenModal>

      {/* Delete Confirmation Modal */}
      <FullScreenModal
        visible={showDeleteModal}
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#171717]">
            <View className="p-6">
              <View className="flex-row">
                {/* Danger icon */}
                <View className="mr-3 self-start rounded-full bg-red-50 p-2 dark:bg-red-900/30">
                  <Ionicons name="alert-circle" size={20} color={theme.destructive} />
                </View>

                {/* Title and description */}
                <View className="flex-1">
                  <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Delete Schedule
                  </Text>
                  <Text className="text-sm leading-5 text-gray-600 dark:text-[#A3A3A3]">
                    Are you sure you want to delete "{selectedSchedule?.name}"? This action cannot
                    be undone.
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            {/* Buttons */}
            <View className="flex-row-reverse gap-2 px-6 pb-6 pt-2">
              <TouchableOpacity
                className={`rounded-lg px-4 py-2.5 ${deleting ? "opacity-50" : ""}`}
                style={{ backgroundColor: deleting ? "#6B7280" : "#111827" }}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text className="text-center text-base font-medium text-white">Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 dark:border-[#4D4D4D] dark:bg-[#262626]"
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text className="text-center text-base font-medium text-gray-700 dark:text-white">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </FullScreenModal>
    </>
  );
}
