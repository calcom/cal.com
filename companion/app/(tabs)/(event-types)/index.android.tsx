import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  useCreateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  useEventTypes,
} from "@/hooks";
import { CalComAPIService, type EventType } from "@/services/calcom";
import { openInAppBrowser } from "@/utils/browser";
import { getEventDuration } from "@/utils/getEventDuration";
import { offlineAwareRefresh } from "@/utils/network";
import { slugify } from "@/utils/slugify";

// Toast state type
type ToastState = {
  visible: boolean;
  message: string;
  type: "success" | "error";
};

export default function EventTypesAndroid() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for creating new event type
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");

  // Inline validation error for create modal
  const [validationError, setValidationError] = useState("");

  // Toast state (fixed position snackbar at bottom)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  // AlertDialog state for confirmations
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

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
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load event types." : null;

  // Copied state for UI feedback
  const [copiedEventTypeId, setCopiedEventTypeId] = useState<number | null>(null);

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

  const handleEventTypeLongPress = (_eventType: EventType) => {
    // Android handles long-press via DropdownMenu in EventTypeListItem.android.tsx
    return;
  };

  const handleCopyLink = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await Clipboard.setStringAsync(link);
      setCopiedEventTypeId(eventType.id);
      showToast("Link copied to clipboard");
      setTimeout(() => setCopiedEventTypeId(null), 2000);
    } catch {
      showToast("Failed to copy link", "error");
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
      showToast("Failed to share link", "error");
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
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!eventTypeToDelete) return;

    deleteEventTypeMutation(eventTypeToDelete.id, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        setEventTypeToDelete(null);
        showToast("Event type deleted");
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to delete event type", message);
        if (__DEV__) {
          const stack = err instanceof Error ? err.stack : undefined;
          console.debug("[EventTypes] deleteEventType failed", {
            message,
            stack,
          });
        }
        showToast("Failed to delete event type", "error");
      },
    });
  };

  const handleDuplicate = (eventType: EventType) => {
    duplicateEventTypeMutation(
      { eventType, existingEventTypes: eventTypes },
      {
        onSuccess: (duplicatedEventType) => {
          showToast("Event type duplicated");

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
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Failed to duplicate event type", message);
          if (__DEV__) {
            const stack = err instanceof Error ? err.stack : undefined;
            console.debug("[EventTypes] duplicateEventType failed", {
              message,
              stack,
            });
          }
          showToast("Failed to duplicate event type", "error");
        },
      }
    );
  };

  const handlePreview = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      await openInAppBrowser(link, "event type preview");
    } catch {
      console.error("Failed to open preview");
      showToast("Failed to open preview", "error");
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
    setValidationError("");
  };

  const handleCreateEventType = () => {
    // Clear previous error
    setValidationError("");

    if (!newEventTitle.trim()) {
      setValidationError("Please enter a title for your event type");
      return;
    }

    const autoSlug = slugify(newEventTitle.trim());
    if (!autoSlug) {
      setValidationError("Title must contain at least one letter or number");
      return;
    }

    createEventTypeMutation(
      {
        title: newEventTitle.trim(),
        slug: autoSlug,
        lengthInMinutes: 15,
        description: undefined,
      },
      {
        onSuccess: (newEventType) => {
          handleCloseCreateModal();

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
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Failed to create event type", message);
          if (__DEV__) {
            const stack = err instanceof Error ? err.stack : undefined;
            console.debug("[EventTypes] createEventType failed", {
              message,
              stack,
            });
          }
          showToast("Failed to create event type", "error");
        },
      }
    );
  };

  // Clear validation error when title changes
  const handleTitleChange = (text: string) => {
    setNewEventTitle(text);
    if (validationError) {
      setValidationError("");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <View className="flex-1 items-center justify-center bg-gray-50 p-5">
          <Ionicons name="alert-circle" size={64} color="#800020" />
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

      {/* Create Event Type AlertDialog */}
      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a new event type</AlertDialogTitle>
            <AlertDialogDescription>
              Set up event types to offer different types of meetings.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Title Input */}
          <View className="px-1">
            <Text className="mb-2 text-sm font-medium text-gray-700">Title</Text>
            <TextInput
              className={`rounded-md border bg-white px-3 py-2.5 text-base text-gray-900 ${
                validationError ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Quick Chat"
              placeholderTextColor="#9CA3AF"
              value={newEventTitle}
              onChangeText={handleTitleChange}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateEventType}
            />
            {validationError ? (
              <Text className="mt-1.5 text-sm text-red-500">{validationError}</Text>
            ) : null}
          </View>

          <AlertDialogFooter>
            <AlertDialogCancel onPress={handleCloseCreateModal} disabled={creating}>
              <UIText>Cancel</UIText>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleCreateEventType} disabled={creating}>
              <UIText>Continue</UIText>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Type</AlertDialogTitle>
            <AlertDialogDescription>
              {eventTypeToDelete
                ? `This will permanently delete "${eventTypeToDelete.title}". This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onPress={() => {
                setShowDeleteDialog(false);
                setEventTypeToDelete(null);
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
