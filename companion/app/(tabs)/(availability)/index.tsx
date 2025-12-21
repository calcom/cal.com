import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState, useMemo, Activity } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActionSheetIOS,
  Alert,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";

import { CalComAPIService, Schedule } from "../../../services/calcom";
import { Header } from "../../../components/Header";
import { FullScreenModal } from "../../../components/FullScreenModal";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import { EmptyScreen } from "../../../components/EmptyScreen";
import { showErrorAlert } from "../../../utils/alerts";
import { offlineAwareRefresh } from "../../../utils/network";
import { shadows } from "../../../utils/shadows";
import {
  useSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
  useSetScheduleAsDefault,
} from "../../../hooks";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { AvailabilityListItem } from "../../../components/availability-list-item/AvailabilityListItem";

export default function Availability() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
  const onRefresh = () => offlineAwareRefresh(refetch);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleScheduleLongPress = (schedule: Schedule) => {
    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms (Android Alert supports max 3 buttons)
      const options = [];
      if (!schedule.isDefault) {
        options.push({ text: "⭐ Set as default", onPress: () => handleSetAsDefault(schedule) });
      }
      options.push(
        { text: "📋 Duplicate", onPress: () => handleDuplicate(schedule) },
        { text: "🗑️ Delete", style: "destructive", onPress: () => handleDelete(schedule) }
      );
      // Android Alert automatically adds cancel, so we don't need to include it explicitly
      Alert.alert(schedule.name, "", options);
      return;
    }

    const options = ["Cancel"];
    if (!schedule.isDefault) {
      options.push("⭐ Set as default");
    }
    options.push("📋 Duplicate", "🗑️ Delete");

    const destructiveButtonIndex = options.length - 1; // Delete button
    const cancelButtonIndex = 0;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
        cancelButtonIndex,
        title: schedule.name,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) {
          return;
        }

        if (!schedule.isDefault) {
          // Options: ["Cancel", "⭐ Set as default", "📋 Duplicate", "🗑️ Delete"]
          if (buttonIndex === 1) {
            handleSetAsDefault(schedule);
          } else if (buttonIndex === 2) {
            handleDuplicate(schedule);
          } else if (buttonIndex === 3) {
            handleDelete(schedule);
          }
        } else {
          // Options: ["Cancel", "📋 Duplicate", "🗑️ Delete"]
          if (buttonIndex === 1) {
            handleDuplicate(schedule);
          } else if (buttonIndex === 2) {
            handleDelete(schedule);
          }
        }
      }
    );
  };

  const handleSetAsDefault = (schedule: Schedule) => {
    setAsDefaultMutation(schedule.id, {
      onError: () => {
        showErrorAlert("Error", "Failed to set schedule as default. Please try again.");
      },
    });
  };

  const handleDuplicate = (schedule: Schedule) => {
    duplicateScheduleMutation(schedule.id, {
      onError: () => {
        showErrorAlert("Error", "Failed to duplicate schedule. Please try again.");
      },
    });
  };

  const handleDelete = (schedule: Schedule) => {
    if (Platform.OS === "web") {
      // Use custom modal for web
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
      },
      onError: () => {
        showErrorAlert("Error", "Failed to delete schedule. Please try again.");
      },
    });
  };

  const handleSchedulePress = (schedule: Schedule) => {
    router.push({
      pathname: "/availability-detail",
      params: { id: schedule.id.toString() },
    });
  };

  const handleCreateNew = () => {
    setNewScheduleName("");
    setShowCreateModal(true);
  };

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      Alert.alert("Error", "Please enter a schedule name");
      return;
    }

    // Get user's timezone (default to America/New_York if not available)
    let userTimezone = "America/New_York";
    try {
      const userProfile = await CalComAPIService.getUserProfile();
      if (userProfile.timeZone) {
        userTimezone = userProfile.timeZone;
      }
    } catch (error) {
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
          setShowCreateModal(false);
          setNewScheduleName("");

          // Navigate to edit the newly created schedule
          router.push({
            pathname: "/availability-detail",
            params: {
              id: newSchedule.id.toString(),
            },
          });
        },
        onError: (error) => {
          console.error("Failed to create schedule:", error);
          showErrorAlert("Error", "Failed to create schedule. Please try again.");
        },
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8f9fa]">
        <Header />
        <View className="flex-1 items-center justify-center p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-[#f8f9fa]">
        <Header />
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle" size={64} color="#FF3B30" />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-[#333]">
            Unable to load availability
          </Text>
          <Text className="mb-6 text-center text-base text-[#666]">{error}</Text>
          <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={() => refetch()}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
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
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"} // Only looks cool on iOS 18 and below
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
          onChangeText={(e) => handleSearch(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor="#fff"
        />
      </Stack.Header>

      <Activity mode={Platform.OS !== "ios" ? "visible" : "hidden"}>
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
      </Activity>

      {/* Empty state - no schedules */}
      <Activity mode={showEmptyState ? "visible" : "hidden"}>
        <ScrollView
          style={{ backgroundColor: "white" }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            paddingBottom: 90,
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            style={{ backgroundColor: "white" }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
              paddingBottom: 90,
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
          <FlatList
            className="flex-1 rounded-lg border border-[#E5E5EA] bg-white"
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
                handleScheduleLongPress={handleScheduleLongPress}
                setSelectedSchedule={setSelectedSchedule}
                setShowActionsModal={setShowActionsModal}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onSetAsDefault={handleSetAsDefault}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          />
        </Activity>
      </Activity>

      {/* Create Schedule Modal */}
      <FullScreenModal
        visible={showCreateModal}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity
            className="w-[90%] max-w-[500px] rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={shadows.xl()}
          >
            {/* Header */}
            <View className="px-8 pb-4 pt-6">
              <Text className="text-2xl font-semibold text-[#111827]">Add a new schedule</Text>
            </View>

            {/* Content */}
            <View className="px-8 pb-6">
              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-[#374151]">Name</Text>
                <TextInput
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827]"
                  placeholder="Working Hours"
                  placeholderTextColor="#9CA3AF"
                  value={newScheduleName}
                  onChangeText={setNewScheduleName}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateSchedule}
                />
              </View>
            </View>

            {/* Footer */}
            <View className="rounded-b-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4">
              <View className="flex-row justify-end gap-2 space-x-2">
                <TouchableOpacity
                  className="rounded-xl border border-[#D1D5DB] bg-white px-2 py-2 md:px-4"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewScheduleName("");
                  }}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-[#374151]">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-xl bg-[#111827] px-2 py-2 md:px-4 ${creating ? "opacity-60" : ""}`}
                  onPress={handleCreateSchedule}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-white">Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Schedule Actions Modal */}
      <FullScreenModal
        visible={showActionsModal}
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6">
              <Text className="text-center text-xl font-semibold text-gray-900">
                Schedule Actions
              </Text>
            </View>

            {/* Actions List */}
            <View className="p-2">
              {/* Set as Default - only show if not already default */}
              <Activity
                mode={selectedSchedule && !selectedSchedule.isDefault ? "visible" : "hidden"}
              >
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setShowActionsModal(false);
                      if (selectedSchedule) {
                        handleSetAsDefault(selectedSchedule);
                      }
                    }}
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                  >
                    <Ionicons name="star-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Set as Default</Text>
                  </TouchableOpacity>

                  <View className="mx-4 my-2 h-px bg-gray-200" />
                </>
              </Activity>

              {/* Duplicate */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    setTimeout(() => {
                      handleDuplicate(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="copy-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">Duplicate</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="mx-4 my-2 h-px bg-gray-200" />

              {/* Delete */}
              <TouchableOpacity
                onPress={() => {
                  setShowActionsModal(false);
                  if (selectedSchedule) {
                    // Small delay to ensure modal closes before alert shows
                    setTimeout(() => {
                      handleDelete(selectedSchedule);
                    }, 100);
                  }
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="trash-outline" size={20} color="#800000" />
                <Text className="ml-3 text-base text-[#800000]">Delete</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3"
                onPress={() => setShowActionsModal(false)}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Delete Confirmation Modal */}
      <FullScreenModal
        visible={showDeleteModal}
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6">
            {/* Icon */}
            <View className="mb-4 items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Ionicons name="trash-outline" size={24} color="#800000" />
              </View>
            </View>

            {/* Title */}
            <Text className="mb-2 text-center text-xl font-semibold text-gray-900">
              Delete Schedule
            </Text>

            {/* Description */}
            <Text className="mb-6 text-center text-base text-gray-600">
              Are you sure you want to delete "{selectedSchedule?.name}"? This action cannot be
              undone.
            </Text>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-gray-100 px-4 py-3"
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text className="text-center text-base font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-lg bg-gray-900 px-4 py-3 ${deleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text className="text-center text-base font-semibold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </FullScreenModal>
    </>
  );
}
