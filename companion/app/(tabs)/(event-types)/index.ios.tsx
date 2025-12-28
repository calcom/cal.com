import { Button, ContextMenu, Host, HStack, Image as SwiftUIImage } from "@expo/ui/swift-ui";
import { buttonStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EmptyScreen } from "@/components/EmptyScreen";
import { EventTypeListItem } from "@/components/event-type-list-item/EventTypeListItem";
import { FullScreenModal } from "@/components/FullScreenModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  useCreateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  useEventTypes,
  useUsername,
} from "@/hooks";
import { CalComAPIService, type EventType } from "@/services/calcom";
import { showErrorAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getEventDuration } from "@/utils/getEventDuration";
import { offlineAwareRefresh } from "@/utils/network";
import { normalizeMarkdown } from "@/utils/normalizeMarkdown";
import { shadows } from "@/utils/shadows";
import { slugify } from "@/utils/slugify";

export default function EventTypesIOS() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for creating new event type
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventSlug, setNewEventSlug] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDuration, setNewEventDuration] = useState("15");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

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

  const { data: username = "" } = useUsername();
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

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

  // Handle pull-to-refresh (offline-aware)
  const onRefresh = () => offlineAwareRefresh(refetch);

  // Filter event types based on search query
  const filteredEventTypes = useMemo(() => {
    if (searchQuery.trim() === "") {
      return eventTypes;
    }
    const searchLower = searchQuery.toLowerCase();
    return eventTypes.filter(
      (eventType) =>
        eventType.title.toLowerCase().includes(searchLower) ||
        eventType.description?.toLowerCase().includes(searchLower)
    );
  }, [eventTypes, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleEventTypePress = (eventType: EventType) => {
    handleEdit(eventType);
  };

  const handleEventTypeLongPress = (eventType: EventType) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Edit", "Duplicate", "Delete"],
        destructiveButtonIndex: 3, // Delete button
        cancelButtonIndex: 0,
        title: eventType.title,
        message: eventType.description ? normalizeMarkdown(eventType.description) : undefined,
      },
      (buttonIndex) => {
        switch (buttonIndex) {
          case 1: // Edit
            handleEdit(eventType);
            break;
          case 2: // Duplicate
            handleDuplicate(eventType);
            break;
          case 3: // Delete
            handleDelete(eventType);
            break;
          default:
            // Cancel - do nothing
            break;
        }
      }
    );
  };

  const handleCopyLink = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await Clipboard.setStringAsync(link);
      Alert.alert("Link Copied", "Event type link copied!");
    } catch {
      showErrorAlert("Error", "Failed to copy link. Please try again.");
    }
  };

  const _handleShare = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await Share.share({
        message: `Book a meeting: ${eventType.title}`,
        url: link,
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
        Alert.alert("Success", "Event type deleted successfully");
      },
      onError: (deleteError) => {
        const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error("Failed to delete event type", message);
        if (__DEV__) {
          const stack = deleteError instanceof Error ? deleteError.stack : undefined;
          console.debug("[EventTypes] deleteEventType failed", { message, stack });
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
          Alert.alert("Success", "Event type duplicated successfully");

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
        onError: (duplicateError) => {
          const message =
            duplicateError instanceof Error ? duplicateError.message : String(duplicateError);
          console.error("Failed to duplicate event type", message);
          if (__DEV__) {
            const stack = duplicateError instanceof Error ? duplicateError.stack : undefined;
            console.debug("[EventTypes] duplicateEventType failed", { message, stack });
          }
          showErrorAlert("Error", "Failed to duplicate event type. Please try again.");
        },
      }
    );
  };

  const handlePreview = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      // For mobile, use in-app browser
      await openInAppBrowser(link, "event type preview");
    } catch {
      console.error("Failed to open preview");
      showErrorAlert("Error", "Failed to open preview. Please try again.");
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewEventTitle("");
    setNewEventSlug("");
    setNewEventDescription("");
    setNewEventDuration("15");
    setIsSlugManuallyEdited(false);
  };

  const handleCreateEventType = () => {
    if (!newEventTitle.trim()) {
      Alert.alert("Error", "Please enter a title for your event type");
      return;
    }

    if (!newEventSlug.trim()) {
      Alert.alert("Error", "Please enter a URL for your event type");
      return;
    }

    const duration = parseInt(newEventDuration, 10);
    if (Number.isNaN(duration) || duration <= 0) {
      Alert.alert("Error", "Please enter a valid duration");
      return;
    }

    createEventTypeMutation(
      {
        title: newEventTitle.trim(),
        slug: newEventSlug.trim(),
        lengthInMinutes: duration,
        description: newEventDescription.trim() || undefined,
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
        onError: (createError) => {
          const message = createError instanceof Error ? createError.message : String(createError);
          console.error("Failed to create event type", message);
          if (__DEV__) {
            const stack = createError instanceof Error ? createError.stack : undefined;
            console.debug("[EventTypes] createEventType failed", { message, stack });
          }
          showErrorAlert("Error", "Failed to create event type. Please try again.");
        },
      }
    );
  };

  // Sort by menu handler (dummy for now)
  const handleSortByOption = (option: string) => {
    console.log("Sort by:", option);
    // TODO: Implement actual sorting logic
  };

  // Filter menu handler (dummy for now)
  const handleFilterOption = (option: string) => {
    console.log("Filter by:", option);
    // TODO: Implement actual filtering logic
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800">
          Unable to load event types
        </Text>
        <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
        <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={() => refetch()}>
          <Text className="text-base font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Event Types",
            headerBlurEffect: isLiquidGlassAvailable() ? undefined : "light",
            headerStyle: { backgroundColor: "transparent" },
            headerLargeTitleEnabled: true,
          }}
        />
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <EmptyScreen
            icon="link-outline"
            headline="Create your first event type"
            description="Event types enable you to share links that show available times on your calendar and allow people to make bookings with you."
            buttonText="New"
            onButtonPress={handleOpenCreateModal}
          />
        </View>

        {/* Create Event Type Modal */}
        {renderCreateModal()}
      </>
    );
  }

  // Render the create modal (extracted for reuse)
  function renderCreateModal() {
    return (
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
            style={shadows.xl()}
          >
            {/* Header */}
            <View className="px-8 pb-4 pt-6">
              <Text className="mb-2 text-2xl font-semibold text-[#111827]">
                Add a new event type
              </Text>
              <Text className="text-sm text-[#6B7280]">
                Set up event types to offer different types of meetings.
              </Text>
            </View>

            {/* Content */}
            <ScrollView className="px-8 pb-6" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#374151]">Title</Text>
                <TextInput
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827] focus:border-black focus:ring-2 focus:ring-black"
                  placeholder="Quick Chat"
                  placeholderTextColor="#9CA3AF"
                  value={newEventTitle}
                  onChangeText={(text) => {
                    setNewEventTitle(text);
                    // Auto-generate slug from title if user hasn't manually edited it
                    if (!isSlugManuallyEdited) {
                      setNewEventSlug(slugify(text, true));
                    }
                  }}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* URL */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#374151]">URL</Text>
                <View className="flex-row items-center rounded-md border border-[#D1D5DB] bg-white focus-within:border-black focus-within:ring-2 focus-within:ring-black">
                  <Text className="px-3 text-base text-[#6B7280]">https://cal.com/{username}/</Text>
                  <TextInput
                    className="flex-1 py-2.5 pr-3 text-base text-[#111827]"
                    placeholder="quick-chat"
                    placeholderTextColor="#9CA3AF"
                    value={newEventSlug}
                    onChangeText={(text) => {
                      setIsSlugManuallyEdited(true);
                      setNewEventSlug(slugify(text, true));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-[#374151]">Description</Text>
                <TextInput
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-base text-[#111827] focus:border-black focus:ring-2 focus:ring-black"
                  placeholder="A quick video meeting."
                  placeholderTextColor="#9CA3AF"
                  value={newEventDescription}
                  onChangeText={setNewEventDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="next"
                />
              </View>

              {/* Duration */}
              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-[#374151]">Duration</Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="w-20 rounded-md border border-[#D1D5DB] bg-white px-3 py-2.5 text-center text-base text-[#111827] focus:border-black focus:ring-2 focus:ring-black"
                    placeholder="15"
                    placeholderTextColor="#9CA3AF"
                    value={newEventDuration}
                    onChangeText={setNewEventDuration}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateEventType}
                  />
                  <Text className="ml-3 text-base text-[#6B7280]">minutes</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="rounded-b-2xl border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4">
              <View className="flex-row justify-end gap-2 space-x-2">
                <TouchableOpacity
                  className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2"
                  onPress={handleCloseCreateModal}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-[#374151]">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-xl bg-[#111827] px-4 py-2 ${creating ? "opacity-60" : ""}`}
                  onPress={handleCreateEventType}
                  disabled={creating}
                >
                  <Text className="text-base font-medium text-white">Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </FullScreenModal>
    );
  }

  return (
    <>
      {/* iOS Native Header with Glass UI */}
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"}
      >
        <Stack.Header.Title large>Event Types</Stack.Header.Title>

        <Stack.Header.Right>
          {/* Filter/Sort Menu */}
          <Stack.Header.Menu>
            <Stack.Header.Icon sf="line.3.horizontal.decrease" />

            {/* Sort by Submenu - opens as separate submenu */}
            <Stack.Header.Menu title="Sort by">
              <Stack.Header.MenuAction
                icon="textformat.abc"
                onPress={() => handleSortByOption("alphabetical")}
              >
                Alphabetical
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon="calendar.badge.clock"
                onPress={() => handleSortByOption("newest")}
              >
                Newest First
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction icon="clock" onPress={() => handleSortByOption("duration")}>
                By Duration
              </Stack.Header.MenuAction>
            </Stack.Header.Menu>

            {/* Filter Submenu - opens as separate submenu */}
            <Stack.Header.Menu title="Filter">
              <Stack.Header.MenuAction
                icon="checkmark.circle"
                onPress={() => handleFilterOption("all")}
              >
                All Event Types
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction icon="eye" onPress={() => handleFilterOption("active")}>
                Active Only
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon="dollarsign.circle"
                onPress={() => handleFilterOption("paid")}
              >
                Paid Events
              </Stack.Header.MenuAction>
            </Stack.Header.Menu>
          </Stack.Header.Menu>

          {/* Profile Button - Opens bottom sheet */}
          <Stack.Header.Button onPress={() => router.push("/profile-sheet")}>
            <Stack.Header.Icon sf="person.circle.fill" />
          </Stack.Header.Button>
        </Stack.Header.Right>

        {/* Search Bar */}
        <Stack.Header.SearchBar
          placeholder="Search event types"
          onChangeText={(e) => handleSearch(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor="#fff"
        />
      </Stack.Header>

      {/* Event Types List */}
      <ScrollView
        style={{ backgroundColor: "white" }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {filteredEventTypes.length === 0 && searchQuery.trim() !== "" ? (
          <View className="flex-1 items-center justify-center bg-gray-50 p-5 pt-20">
            <EmptyScreen
              icon="search-outline"
              headline={`No results found for "${searchQuery}"`}
              description="Try searching with different keywords"
            />
          </View>
        ) : (
          <View className="px-2 pt-4 md:px-4">
            <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
              {filteredEventTypes.map((item, index) => (
                <EventTypeListItem
                  key={item.id.toString()}
                  item={item}
                  index={index}
                  filteredEventTypes={filteredEventTypes}
                  copiedEventTypeId={null}
                  handleEventTypePress={handleEventTypePress}
                  handleEventTypeLongPress={handleEventTypeLongPress}
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

      {/* Floating Action Button for New Event Type with Glass UI Menu */}
      <View className="absolute right-6" style={{ bottom: 100 }}>
        <Host matchContents>
          <ContextMenu
            modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"), padding()]}
            activationMethod="singlePress"
          >
            <ContextMenu.Items>
              <Button systemImage="link" onPress={handleOpenCreateModal} label="New Event Type" />
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <HStack modifiers={[frame({ width: 35, height: 40 })]}>
                <SwiftUIImage
                  systemName="plus"
                  color="primary"
                  size={28}
                  // modifiers={[frame({ width: 56, height: 56 })]}
                />
              </HStack>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      </View>

      {/* Create Event Type Modal */}
      {renderCreateModal()}

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
          <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header with icon and title */}
            <View className="p-6">
              <View className="flex-row">
                {/* Danger icon */}
                <View className="mr-3 self-start rounded-full bg-red-50 p-2">
                  <Ionicons name="alert-circle" size={20} color="#800000" />
                </View>

                {/* Title and description */}
                <View className="flex-1">
                  <Text className="mb-2 text-xl font-semibold text-gray-900">
                    Delete Event Type
                  </Text>
                  <Text className="text-sm leading-5 text-gray-600">
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
                className={`rounded-lg bg-gray-900 px-4 py-2.5 ${isDeleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                <Text className="text-center text-base font-medium text-white">Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5"
                onPress={() => {
                  setShowDeleteModal(false);
                  setEventTypeToDelete(null);
                }}
                disabled={isDeleting}
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </FullScreenModal>
    </>
  );
}
