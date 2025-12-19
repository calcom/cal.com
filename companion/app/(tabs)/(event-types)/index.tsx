import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState, useMemo, Activity } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActionSheetIOS,
  Share,
  Alert,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { CalComAPIService, EventType } from "../../../services/calcom";
import { Header } from "../../../components/Header";
import { FullScreenModal } from "../../../components/FullScreenModal";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import { EmptyScreen } from "../../../components/EmptyScreen";
import { slugify } from "../../../utils/slugify";
import { showErrorAlert } from "../../../utils/alerts";
import { shadows } from "../../../utils/shadows";
import { EventTypeListItem } from "../../../components/event-type-list-item/EventTypeListItem";
import { offlineAwareRefresh } from "../../../utils/network";
import { openInAppBrowser } from "../../../utils/browser";
import {
  useEventTypes,
  useCreateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  useUsername,
} from "../../../hooks";
import { getEventDuration } from "../../../utils/getEventDuration";
import { normalizeMarkdown } from "../../../utils/normalizeMarkdown";
import { isLiquidGlassAvailable } from "expo-glass-effect";

export default function EventTypes() {
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

  // Modal state for web platform action sheet
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  // Modal state for New button menu
  const [showNewModal, setShowNewModal] = useState(false);

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

  // Toast state for web platform
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copiedEventTypeId, setCopiedEventTypeId] = useState<number | null>(null);

  // Function to show toast
  const showToastMessage = (message: string, eventTypeId?: number) => {
    setToastMessage(message);
    setShowToast(true);
    if (eventTypeId) {
      setCopiedEventTypeId(eventTypeId);
    }
    setTimeout(() => {
      setShowToast(false);
      setCopiedEventTypeId(null);
    }, 2000);
  };

  // Handle pull-to-refresh
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
        (eventType.description && eventType.description.toLowerCase().includes(searchLower))
    );
  }, [eventTypes, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleEventTypePress = (eventType: EventType) => {
    handleEdit(eventType);
  };

  const handleEventTypeLongPress = (eventType: EventType) => {
    if (Platform.OS === "web") {
      // Show custom modal for web platform
      setSelectedEventType(eventType);
      setShowActionModal(true);
      return;
    }

    if (Platform.OS !== "ios") {
      // Fallback for non-iOS platforms (Android)
      Alert.alert(eventType.title, eventType.description || "", [
        { text: "Cancel", style: "cancel" },
        { text: "Edit", onPress: () => handleEdit(eventType) },
        { text: "Duplicate", onPress: () => handleDuplicate(eventType) },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(eventType) },
      ]);
      return;
    }

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

      if (Platform.OS === "web") {
        showToastMessage("Link copied!", eventType.id);
      } else {
        Alert.alert("Link Copied", "Event type link copied!");
      }
    } catch (error) {
      if (Platform.OS === "web") {
        showToastMessage("Failed to copy link");
      } else {
        showErrorAlert("Error", "Failed to copy link. Please try again.");
      }
    }
  };

  const handleShare = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await Share.share({
        message: `Book a meeting: ${eventType.title}`,
        url: link,
      });
    } catch (error) {
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

        if (Platform.OS === "web") {
          showToastMessage("Event type deleted successfully");
        } else {
          Alert.alert("Success", "Event type deleted successfully");
        }
      },
      onError: (error) => {
        console.error("Failed to delete event type:", error);
        if (Platform.OS === "web") {
          showToastMessage("Failed to delete event type");
        } else {
          showErrorAlert("Error", "Failed to delete event type. Please try again.");
        }
      },
    });
  };

  const handleDuplicate = (eventType: EventType) => {
    duplicateEventTypeMutation(
      { eventType, existingEventTypes: eventTypes },
      {
        onSuccess: (duplicatedEventType) => {
          if (Platform.OS === "web") {
            showToastMessage("Event type duplicated successfully");
          } else {
            Alert.alert("Success", "Event type duplicated successfully");
          }

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
          console.error("Failed to duplicate event type:", error);
          if (Platform.OS === "web") {
            showToastMessage("Failed to duplicate event type");
          } else {
            showErrorAlert("Error", "Failed to duplicate event type. Please try again.");
          }
        },
      }
    );
  };

  const handlePreview = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      // Open in browser
      if (Platform.OS === "web") {
        window.open(link, "_blank");
      } else {
        // For mobile, use in-app browser
        await openInAppBrowser(link, "event type preview");
      }
    } catch (error) {
      console.error("Failed to open preview:", error);
      if (Platform.OS === "web") {
        showToastMessage("Failed to open preview");
      } else {
        showErrorAlert("Error", "Failed to open preview. Please try again.");
      }
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

    const duration = parseInt(newEventDuration);
    if (isNaN(duration) || duration <= 0) {
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
        onError: (error) => {
          console.error("Failed to create event type:", error);
          showErrorAlert("Error", "Failed to create event type. Please try again.");
        },
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <Activity mode={Platform.OS === "web" ? "visible" : "hidden"}>
          <Header />
        </Activity>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <Activity mode={Platform.OS === "web" ? "visible" : "hidden"}>
          <Header />
        </Activity>
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
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View className="flex-1 bg-gray-100">
        <Activity mode={Platform.OS === "web" ? "visible" : "hidden"}>
          <Header />
        </Activity>
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
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
      <View className="flex-1 bg-gray-100">
        <Activity mode={Platform.OS === "web" ? "visible" : "hidden"}>
          <Header />
          <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
            <TextInput
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
              placeholder="Search event types"
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
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : "light"} // Only looks cool on iOS 18 and below
        hidden={Platform.OS === "android"}
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
      <Activity mode={Platform.OS === "web" || Platform.OS === "android" ? "visible" : "hidden"}>
        <Header />
        <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
            placeholder="Search event types"
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

      <ScrollView
        style={{ backgroundColor: "white" }}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="px-2 pt-4 md:px-4">
          <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
            {filteredEventTypes.map((item, index) => (
              <EventTypeListItem
                key={item.id.toString()}
                item={item}
                index={index}
                filteredEventTypes={filteredEventTypes}
                copiedEventTypeId={copiedEventTypeId}
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
      </ScrollView>

      {/* Create Event Type Modal */}
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
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedEventType ? (
              <>
                <View className="border-b border-gray-200 p-6">
                  <Text className="mb-2 text-lg font-semibold text-gray-900">
                    {selectedEventType.title}
                  </Text>
                  {selectedEventType.description ? (
                    <Text className="text-sm text-gray-600">
                      {normalizeMarkdown(selectedEventType.description)}
                    </Text>
                  ) : null}
                </View>

                <View className="p-2">
                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleEdit(eventType);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDuplicate(eventType);
                    }}
                  >
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Duplicate</Text>
                  </TouchableOpacity>

                  {/* Separator before delete button */}
                  <View className="my-2 h-px bg-gray-200" />

                  <TouchableOpacity
                    className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDelete(eventType);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#800000" />
                    <Text className="ml-3 text-base text-[#800000]">Delete</Text>
                  </TouchableOpacity>
                </View>

                <View className="border-t border-gray-200 p-2 md:p-4">
                  <TouchableOpacity
                    className="w-full rounded-lg bg-gray-100 p-3"
                    onPress={() => {
                      setShowActionModal(false);
                      setSelectedEventType(null);
                    }}
                  >
                    <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
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
            className="mx-4 w-full max-w-sm rounded-2xl bg-white"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-b border-gray-200 p-6">
              <Text className="text-xl font-semibold text-gray-900">New</Text>
              <Text className="mt-1 text-sm text-gray-500">Choose what to create</Text>
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
                className="flex-row items-center p-2 hover:bg-gray-50 md:p-4"
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">New Event Type</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel button */}
            <View className="border-t border-gray-200 p-2 md:p-4">
              <TouchableOpacity
                className="w-full rounded-lg bg-gray-100 p-3"
                onPress={() => setShowNewModal(false)}
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

      {/* Toast for Web Platform */}
      {showToast ? (
        <View className="absolute bottom-8 left-1/2 z-50 -translate-x-1/2 transform">
          <View className="rounded-full bg-gray-800 px-6 py-3 shadow-lg">
            <Text className="text-sm font-medium text-white">{toastMessage}</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
