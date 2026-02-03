import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { EmptyScreen } from "@/components/EmptyScreen";
import { EventTypeListItem } from "@/components/event-type-list-item/EventTypeListItem";
import { EventTypeListSkeleton } from "@/components/event-type-list-item/EventTypeListItemSkeleton";
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
  useCreateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  useEventTypes,
} from "@/hooks";
import { useEventTypeFilter } from "@/hooks/useEventTypeFilter";
import type { EventType } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getEventDuration } from "@/utils/getEventDuration";
import { offlineAwareRefresh } from "@/utils/network";
import { normalizeMarkdown } from "@/utils/normalizeMarkdown";
import { shadows } from "@/utils/shadows";
import { slugify } from "@/utils/slugify";

import { getColors } from "@/constants/colors";

export default function EventTypes() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  // Modal state for creating new event type
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [titleError, setTitleError] = useState("");

  // Use React Query hooks
  const {
    data: eventTypes = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useEventTypes();

  // Show refresh indicator when fetching
  const refreshing = isFetching && !loading;

  const { mutate: createEventTypeMutation, isPending: creating } = useCreateEventType();
  const { mutate: deleteEventTypeMutation, isPending: isDeleting } = useDeleteEventType();
  const { mutate: duplicateEventTypeMutation } = useDuplicateEventType();

  // Convert query error to string
  // Don't show error UI for authentication errors (user will be redirected to login)
  // Only show error UI in development mode for other errors
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load event types." : null;

  // Modal state for web platform action sheet
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  // Modal state for New button menu
  const [showNewModal, setShowNewModal] = useState(false);

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

  // Handle pull-to-refresh
  // Handle pull-to-refresh (offline-aware)
  const onRefresh = () => offlineAwareRefresh(refetch);

  // Event type filter and sort hook
  const {
    sortBy,
    filters,
    setSortBy,
    toggleFilter,
    resetFilters,
    filteredAndSortedEventTypes,
    activeFilterCount,
  } = useEventTypeFilter();

  // Filter event types based on search query and filter/sort options
  const filteredEventTypes = useMemo(() => {
    // First apply filter/sort from the hook
    let filtered = filteredAndSortedEventTypes(eventTypes);

    // Then apply search query filter
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (eventType) =>
          eventType.title.toLowerCase().includes(searchLower) ||
          eventType.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [eventTypes, searchQuery, filteredAndSortedEventTypes]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleEventTypePress = (eventType: EventType) => {
    handleEdit(eventType);
  };

  const handleCopyLink = async (eventType: EventType) => {
    if (!eventType.bookingUrl) {
      showErrorAlert("Error", "Booking URL not available for this event type.");
      return;
    }
    try {
      await Clipboard.setStringAsync(eventType.bookingUrl);
      showSuccessAlert("Link Copied", "Event type link copied!");
    } catch {
      showErrorAlert("Error", "Failed to copy link. Please try again.");
    }
  };

  const _handleShare = async (eventType: EventType) => {
    if (!eventType.bookingUrl) {
      showErrorAlert("Error", "Booking URL not available for this event type.");
      return;
    }
    try {
      await Share.share({
        message: `Book a meeting: ${eventType.title}`,
        url: eventType.bookingUrl,
      });
    } catch {
      showErrorAlert("Error", "Failed to share link. Please try again.");
    }
  };

  const handleEdit = (eventType: EventType) => {
    const duration = getEventDuration(eventType);
    router.push({
      pathname: "/event-type-detail",
      params: {
        id: eventType.id.toString(),
        title: eventType.title,
        description: eventType.description || "",
        duration: duration.toString(),
        price: eventType.price?.toString() || "",
        currency: eventType.currency || "",
        slug: eventType.slug || "",
      },
    });
  };

  const handleDelete = (eventType: EventType) => {
    // Use native Alert.alert on Android for simple yes/no confirmation
    if (Platform.OS === "android") {
      Alert.alert(
        "Delete Event Type",
        `This will permanently delete the "${eventType.title}" event type. This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteEventTypeMutation(eventType.id, {
                onSuccess: () => {
                  showSuccessAlert("Success", "Event type deleted successfully");
                },
                onError: (error) => {
                  const message = error instanceof Error ? error.message : String(error);
                  console.error("Failed to delete event type", message);
                  if (__DEV__) {
                    const stack = error instanceof Error ? error.stack : undefined;
                    console.debug("[EventTypes] deleteEventType failed", {
                      message,
                      stack,
                    });
                  }
                  showErrorAlert("Error", "Failed to delete event type. Please try again.");
                },
              });
            },
          },
        ]
      );
      return;
    }

    // Use custom modal for iOS and web
    setEventTypeToDelete(eventType);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!eventTypeToDelete) return;

    deleteEventTypeMutation(eventTypeToDelete.id, {
      onSuccess: () => {
        // Close modal and reset state
        setShowDeleteModal(false);
        setEventTypeToDelete(null);

        showSuccessAlert("Success", "Event type deleted successfully");
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to delete event type", message);
        if (__DEV__) {
          const stack = error instanceof Error ? error.stack : undefined;
          console.debug("[EventTypes] deleteEventType failed", {
            message,
            stack,
          });
        }
        showErrorAlert("Error", "Failed to delete event type. Please try again.");
      },
    });
  };

  const handleDuplicate = (eventType: EventType) => {
    duplicateEventTypeMutation(
      { eventType, existingEventTypes: eventTypes },
      {
        onSuccess: (duplicatedEventType) => {
          showSuccessAlert("Success", "Event type duplicated successfully");

          const duration = getEventDuration(eventType);

          // Navigate to edit the newly created duplicate
          router.push({
            pathname: "/event-type-detail",
            params: {
              id: duplicatedEventType.id.toString(),
              title: duplicatedEventType.title,
              description: duplicatedEventType.description || "",
              duration: (
                duplicatedEventType.lengthInMinutes ||
                duplicatedEventType.length ||
                duration
              ).toString(),
              slug: duplicatedEventType.slug || "",
            },
          });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Failed to duplicate event type", message);
          if (__DEV__) {
            const stack = error instanceof Error ? error.stack : undefined;
            console.debug("[EventTypes] duplicateEventType failed", {
              message,
              stack,
            });
          }
          showErrorAlert("Error", "Failed to duplicate event type. Please try again.");
        },
      }
    );
  };

  const handlePreview = async (eventType: EventType) => {
    if (!eventType.bookingUrl) {
      showErrorAlert("Error", "Booking URL not available for this event type.");
      return;
    }
    try {
      if (Platform.OS === "web") {
        window.open(eventType.bookingUrl, "_blank");
      } else {
        await openInAppBrowser(eventType.bookingUrl, "event type preview");
      }
    } catch {
      console.error("Failed to open preview");
      showErrorAlert("Error", "Failed to open preview. Please try again.");
    }
  };

  const handleCreateNew = () => {
    handleOpenCreateModal();
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewEventTitle("");
    setTitleError("");
  };

  const handleCreateEventType = () => {
    // Clear previous error
    setTitleError("");

    if (!newEventTitle.trim()) {
      // Use inline error for Android AlertDialog, showErrorAlert for others
      if (Platform.OS === "android") {
        setTitleError("Please enter a title for your event type");
      } else {
        showErrorAlert("Error", "Please enter a title for your event type");
      }
      return;
    }

    const autoSlug = slugify(newEventTitle.trim());
    if (!autoSlug) {
      if (Platform.OS === "android") {
        setTitleError("Title must contain at least one letter or number");
      } else {
        showErrorAlert("Error", "Title must contain at least one letter or number");
      }
      return;
    }

    createEventTypeMutation(
      {
        title: newEventTitle.trim(),
        slug: autoSlug,
        lengthInMinutes: 15, // Default duration
        description: undefined, // Empty description
      },
      {
        onSuccess: (newEventType) => {
          // Close modal and reset form
          handleCloseCreateModal();

          // Navigate to edit the newly created event type
          router.push({
            pathname: "/event-type-detail",
            params: {
              id: newEventType.id.toString(),
              title: newEventType.title,
              description: newEventType.description || "",
              duration: (newEventType.lengthInMinutes || newEventType.length || 15).toString(),
              slug: newEventType.slug || "",
            },
          });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Failed to create event type", message);
          if (__DEV__) {
            const stack = error instanceof Error ? error.stack : undefined;
            console.debug("[EventTypes] createEventType failed", {
              message,
              stack,
            });
          }
          showErrorAlert("Error", "Failed to create event type. Please try again.");
        },
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {Platform.OS === "web" && <Header />}
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <EventTypeListSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {Platform.OS === "web" && <Header />}
        <View
          className="flex-1 items-center justify-center bg-gray-50 p-5"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
          <Ionicons name="alert-circle" size={64} color={theme.destructive} />
          <Text
            className="mb-2 mt-4 text-center text-xl font-bold text-gray-800"
            style={{ color: theme.text }}
          >
            Unable to load event types
          </Text>
          <Text
            className="mb-6 text-center text-base text-gray-500"
            style={{ color: theme.textMuted }}
          >
            {error}
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-black px-6 py-3"
            style={{ backgroundColor: isDark ? "white" : "black" }}
            onPress={() => refetch()}
          >
            <Text
              className="text-base font-semibold text-white"
              style={{ color: isDark ? "black" : "white" }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {Platform.OS === "web" && <Header />}
        <View
          className="flex-1 items-center justify-center bg-gray-50 p-5"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
          <EmptyScreen
            icon="link-outline"
            headline="Create your first event type"
            description="Event types enable you to share links that show available times on your calendar and allow people to make bookings with you."
            buttonText="New"
            onButtonPress={handleCreateNew}
          />
        </View>
      </View>
    );
  }

  if (filteredEventTypes.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {Platform.OS === "web" && (
          <>
            <Header />
            <View
              className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2"
              style={{
                borderBottomColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
              }}
            >
              <TextInput
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
                style={{
                  borderColor: theme.border,
                  backgroundColor: isDark ? theme.background : "white",
                  color: theme.text,
                }}
                placeholder="Search event types"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <TouchableOpacity
                className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "white" : "black",
                }}
                onPress={handleCreateNew}
              >
                <Ionicons name="add" size={18} color={isDark ? "#000" : "#fff"} />
                <Text
                  className="text-base font-semibold text-white"
                  style={{ color: isDark ? "black" : "white" }}
                >
                  New
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View
          className="flex-1 items-center justify-center bg-gray-50 p-5"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
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
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"} // Only looks cool on iOS 18 and below
        hidden={Platform.OS === "android" || Platform.OS === "web"}
      >
        <Stack.Header.Title large>Event Types</Stack.Header.Title>
        <Stack.Header.Right>
          <Stack.Header.Button onPress={handleCreateNew} tintColor="#000" variant="prominent">
            New
          </Stack.Header.Button>
        </Stack.Header.Right>
        <Stack.Header.SearchBar
          placeholder="Search event types"
          onChangeText={(e) => handleSearch(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor="#fff"
        />
      </Stack.Header>
      {(Platform.OS === "web" || Platform.OS === "android") && (
        <>
          <Header
            eventTypeFilterConfig={{
              sortBy,
              filters,
              onSortChange: setSortBy,
              onToggleFilter: toggleFilter,
              onResetFilters: resetFilters,
              activeFilterCount,
            }}
          />
          <View
            className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2"
            style={{ borderBottomColor: theme.border, backgroundColor: theme.backgroundSecondary }}
          >
            <TextInput
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
              style={{
                borderColor: theme.border,
                backgroundColor: isDark ? theme.background : "white",
                color: theme.text,
              }}
              placeholder="Search event types"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <TouchableOpacity
              className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "white" : "black",
              }}
              onPress={handleCreateNew}
            >
              <Ionicons name="add" size={18} color={isDark ? "#000" : "#fff"} />
              <Text
                className="text-base font-semibold text-white"
                style={{ color: isDark ? "black" : "white" }}
              >
                New
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {refreshing ? (
          <EventTypeListSkeleton />
        ) : filteredEventTypes.length === 0 && activeFilterCount > 0 ? (
          <View
            className="flex-1 items-center justify-center bg-white p-5 pt-20"
            style={{ backgroundColor: theme.background }}
          >
            <EmptyScreen
              icon="filter-outline"
              headline="No event types match your filters"
              description="Try adjusting your filter criteria or clear all filters to see all event types"
              buttonText="Clear Filters"
              onButtonPress={resetFilters}
              className="border-0"
            />
          </View>
        ) : (
          <View className="px-2 pt-4 md:px-4">
            <View
              className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white"
              style={{ borderColor: theme.border, backgroundColor: theme.backgroundSecondary }}
            >
              {filteredEventTypes.map((item, index) => (
                <EventTypeListItem
                  key={item.id.toString()}
                  item={item}
                  index={index}
                  filteredEventTypes={filteredEventTypes}
                  handleEventTypePress={handleEventTypePress}
                  handleCopyLink={handleCopyLink}
                  handlePreview={handlePreview}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Event Type Modal - Android uses AlertDialog */}
      {Platform.OS === "android" ? (
        <AlertDialog
          open={showCreateModal}
          onOpenChange={(open) => {
            if (!open) handleCloseCreateModal();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader className="items-start">
              <AlertDialogTitle>
                <AlertDialogText className="text-left text-lg font-semibold">
                  Add a new event type
                </AlertDialogText>
              </AlertDialogTitle>
              <AlertDialogDescription>
                <AlertDialogText className="text-left text-sm text-muted-foreground">
                  Set up event types to offer different types of meetings.
                </AlertDialogText>
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Title Input */}
            <View>
              <AlertDialogText className="mb-2 text-sm font-medium">Title</AlertDialogText>
              <TextInput
                className={`rounded-md border bg-white px-3 py-2.5 text-base text-gray-900 ${
                  titleError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Quick Chat"
                placeholderTextColor="#9CA3AF"
                value={newEventTitle}
                onChangeText={(text) => {
                  setNewEventTitle(text);
                  if (titleError) setTitleError("");
                }}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreateEventType}
              />
              {titleError ? (
                <AlertDialogText className="mt-1 text-sm text-red-500">
                  {titleError}
                </AlertDialogText>
              ) : null}
            </View>

            <AlertDialogFooter>
              <AlertDialogCancel onPress={handleCloseCreateModal} disabled={creating}>
                <AlertDialogText>Cancel</AlertDialogText>
              </AlertDialogCancel>
              <AlertDialogAction onPress={handleCreateEventType} disabled={creating}>
                <AlertDialogText className="text-white">Continue</AlertDialogText>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <FullScreenModal
          visible={showCreateModal}
          animationType="fade"
          onRequestClose={handleCloseCreateModal}
        >
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
            activeOpacity={1}
            onPress={handleCloseCreateModal}
          >
            <TouchableOpacity
              className="max-h-[90%] w-[90%] max-w-[500px] rounded-2xl bg-white"
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ ...shadows.xl(), backgroundColor: theme.backgroundSecondary }}
            >
              {/* Header */}
              <View className="px-8 pb-4 pt-6">
                <Text
                  className="mb-2 text-2xl font-semibold text-gray-900"
                  style={{ color: theme.text }}
                >
                  Add a new event type
                </Text>
                <Text className="text-sm text-gray-500" style={{ color: theme.textSecondary }}>
                  Set up event types to offer different types of meetings.
                </Text>
              </View>

              {/* Content */}
              <View className="px-8 pb-6">
                {/* Title */}
                <View className="mb-4">
                  <Text
                    className="mb-2 text-sm font-medium text-gray-700"
                    style={{ color: theme.textSecondary }}
                  >
                    Title
                  </Text>
                  <TextInput
                    className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 focus:border-black focus:ring-2 focus:ring-black"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: isDark ? theme.backgroundMuted : "white",
                      color: theme.text,
                    }}
                    placeholder="Quick Chat"
                    placeholderTextColor={theme.textSecondary}
                    value={newEventTitle}
                    onChangeText={setNewEventTitle}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateEventType}
                  />
                </View>
              </View>

              {/* Footer */}
              <View className="rounded-b-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4 dark:border-[#4D4D4D] dark:bg-[#2C2C2E]">
                <View className="flex-row justify-end gap-2 space-x-2">
                  <TouchableOpacity
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-[#4D4D4D] dark:bg-[#171717]"
                    onPress={handleCloseCreateModal}
                    disabled={creating}
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
                      Close
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`rounded-xl bg-[#111827] px-4 py-2 dark:bg-white ${creating ? "opacity-60" : ""}`}
                    onPress={handleCreateEventType}
                    disabled={creating}
                  >
                    <Text className="text-base font-medium text-white dark:text-black">
                      Continue
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </FullScreenModal>
      )}

      {/* Action Modal for Web Platform */}
      <FullScreenModal
        visible={showActionModal}
        animationType="fade"
        onRequestClose={() => {
          setShowActionModal(false);
          setSelectedEventType(null);
        }}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => {
            setShowActionModal(false);
            setSelectedEventType(null);
          }}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[#171717]"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedEventType ? (
              <>
                <View className="border-b border-gray-200 p-6 dark:border-[#4D4D4D]">
                  <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedEventType.title}
                  </Text>
                  {selectedEventType.description ? (
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {normalizeMarkdown(selectedEventType.description)}
                    </Text>
                  ) : null}
                </View>

                <View className="p-2">
                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleEdit(eventType);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color={theme.textSecondary} />
                    <Text className="ml-3 text-base text-gray-900 dark:text-white">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDuplicate(eventType);
                    }}
                  >
                    <Ionicons name="copy-outline" size={20} color={theme.textSecondary} />
                    <Text className="ml-3 text-base text-gray-900 dark:text-white">Duplicate</Text>
                  </TouchableOpacity>

                  {/* Separator before delete button */}
                  <View className="my-2 h-px bg-gray-200 dark:bg-[#4D4D4D]" />

                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDelete(eventType);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                    <Text className="ml-3 text-base" style={{ color: theme.destructive }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="border-t border-gray-200 p-2 dark:border-[#4D4D4D] md:p-4">
                  <TouchableOpacity
                    className="w-full rounded-lg bg-gray-100 p-3 dark:bg-[#2C2C2E]"
                    onPress={() => {
                      setShowActionModal(false);
                      setSelectedEventType(null);
                    }}
                  >
                    <Text className="text-center text-base font-medium text-gray-700 dark:text-gray-300">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* New Menu Modal for Web Platform */}
      <FullScreenModal
        visible={showNewModal}
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50 p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowNewModal(false)}
        >
          <TouchableOpacity
            className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[#171717]"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6 dark:border-[#4D4D4D]">
              <Text className="text-xl font-semibold text-gray-900 dark:text-white">New</Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose what to create
              </Text>
            </View>

            {/* Options List */}
            <View className="p-2">
              {/* New Event Type */}
              <TouchableOpacity
                onPress={() => {
                  setShowNewModal(false);
                  // Small delay to ensure the "New" modal closes before opening create modal
                  setTimeout(() => {
                    handleOpenCreateModal();
                  }, 100);
                }}
                className="flex-row items-center p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] md:p-4"
              >
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                <Text className="ml-3 text-base text-gray-900 dark:text-white">New Event Type</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 dark:border-[#4D4D4D] md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3 dark:bg-[#2C2C2E]"
                onPress={() => setShowNewModal(false)}
              >
                <Text className="text-center text-base font-medium text-gray-700 dark:text-gray-300">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>

      {/* Delete Confirmation Modal */}
      <FullScreenModal
        visible={showDeleteModal}
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setEventTypeToDelete(null);
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-[#171717]">
            {/* Header with icon and title */}
            <View className="p-6">
              <View className="flex-row">
                {/* Danger icon */}
                <View className="mr-3 self-start rounded-full bg-red-50 p-2 dark:bg-red-900/30">
                  <Ionicons name="alert-circle" size={20} color={theme.destructive} />
                </View>

                {/* Title and description */}
                <View className="flex-1">
                  <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Delete Event Type
                  </Text>
                  <Text className="text-sm leading-5 text-gray-600 dark:text-gray-400">
                    {eventTypeToDelete ? (
                      <>
                        This will permanently delete the "{eventTypeToDelete.title}" event type.
                        This action cannot be undone.
                      </>
                    ) : null}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer with buttons */}
            <View className="flex-row-reverse gap-2 px-6 pb-6 pt-2">
              <TouchableOpacity
                className={`rounded-lg bg-gray-900 px-4 py-2.5 dark:bg-white ${isDeleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                <Text className="text-center text-base font-medium text-white dark:text-black">
                  Delete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 dark:border-[#4D4D4D] dark:bg-[#2C2C2E]"
                onPress={() => {
                  setShowDeleteModal(false);
                  setEventTypeToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text className="text-center text-base font-medium text-gray-700 dark:text-gray-300">
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
