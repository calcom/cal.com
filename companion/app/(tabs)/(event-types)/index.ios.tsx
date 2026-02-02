import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { EmptyScreen } from "@/components/EmptyScreen";
import { EventTypeListItem } from "@/components/event-type-list-item/EventTypeListItem";
import { EventTypeListSkeleton } from "@/components/event-type-list-item/EventTypeListItemSkeleton";
import {
  useCreateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  useEventTypes,
  useUserProfile,
} from "@/hooks";
import { useEventTypeFilter } from "@/hooks/useEventTypeFilter";
import type { EventType } from "@/services/calcom";
import { showErrorAlert, showSuccessAlert } from "@/utils/alerts";
import { openInAppBrowser } from "@/utils/browser";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { getEventDuration } from "@/utils/getEventDuration";
import { offlineAwareRefresh } from "@/utils/network";
import { slugify } from "@/utils/slugify";

import { getColors } from "@/constants/colors";

export default function EventTypesIOS() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: userProfile } = useUserProfile();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  // No modal state needed for iOS - using native Alert.prompt

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

  const { mutate: createEventTypeMutation } = useCreateEventType();
  const { mutate: deleteEventTypeMutation } = useDeleteEventType();
  const { mutate: duplicateEventTypeMutation } = useDuplicateEventType();

  // Convert query error to string
  // Don't show error UI for authentication errors (user will be redirected to login)
  // Only show error UI in development mode for other errors
  const isAuthError =
    queryError?.message?.includes("Authentication") ||
    queryError?.message?.includes("sign in") ||
    queryError?.message?.includes("401");
  const error = queryError && !isAuthError && __DEV__ ? "Failed to load event types." : null;

  // No modal state needed for iOS - using native Alert for delete confirmation

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
    // Use native iOS Alert for confirmation
    Alert.alert(
      "Delete Event Type",
      `Are you sure you want to delete "${eventType.title}"? This action cannot be undone.`,
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
              onError: (deleteError) => {
                const message =
                  deleteError instanceof Error ? deleteError.message : String(deleteError);
                console.error("Failed to delete event type", message);
                if (__DEV__) {
                  const stack = deleteError instanceof Error ? deleteError.stack : undefined;
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
        onError: (duplicateError) => {
          const message =
            duplicateError instanceof Error ? duplicateError.message : String(duplicateError);
          console.error("Failed to duplicate event type", message);
          if (__DEV__) {
            const stack = duplicateError instanceof Error ? duplicateError.stack : undefined;
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
      await openInAppBrowser(eventType.bookingUrl, "event type preview");
    } catch {
      console.error("Failed to open preview");
      showErrorAlert("Error", "Failed to open preview. Please try again.");
    }
  };

  const handleOpenCreateModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Use native iOS Alert.prompt for a native look
    Alert.prompt(
      "Add a new event type",
      "Set up event types to offer different types of meetings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: (title?: string) => {
            if (!title?.trim()) {
              showErrorAlert("Error", "Please enter a title for your event type");
              return;
            }

            const autoSlug = slugify(title.trim());
            if (!autoSlug) {
              showErrorAlert("Error", "Title must contain at least one letter or number");
              return;
            }

            createEventTypeMutation(
              {
                title: title.trim(),
                slug: autoSlug,
                lengthInMinutes: 15, // Default duration
                description: undefined, // Empty description
              },
              {
                onSuccess: (newEventType) => {
                  // Navigate to edit the newly created event type
                  router.push({
                    pathname: "/event-type-detail",
                    params: {
                      id: newEventType.id.toString(),
                      title: newEventType.title,
                      description: newEventType.description || "",
                      duration: (
                        newEventType.lengthInMinutes ||
                        newEventType.length ||
                        15
                      ).toString(),
                      slug: newEventType.slug || "",
                    },
                  });
                },
                onError: (createError) => {
                  const message =
                    createError instanceof Error ? createError.message : String(createError);
                  console.error("Failed to create event type", message);
                  if (__DEV__) {
                    const stack = createError instanceof Error ? createError.stack : undefined;
                    console.debug("[EventTypes] createEventType failed", {
                      message,
                      stack,
                    });
                  }
                  showErrorAlert("Error", "Failed to create event type. Please try again.");
                },
              }
            );
          },
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  // Sort by menu handler
  const handleSortByOption = (option: "alphabetical" | "newest" | "duration") => {
    setSortBy(option);
  };

  // Filter menu handler - toggle filters
  const handleFilterToggle = (
    filterKey:
      | "hiddenOnly"
      | "paidOnly"
      | "seatedOnly"
      | "requiresConfirmationOnly"
      | "recurringOnly"
  ) => {
    toggleFilter(filterKey);
  };

  if (loading) {
    return (
      <>
        <Stack.Header
          style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
          blurEffect={isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light"}
        >
          <Stack.Header.Title large>Event Types</Stack.Header.Title>
        </Stack.Header>
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <EventTypeListSkeleton />
        </ScrollView>
      </>
    );
  }

  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-50 p-5"
        style={{ backgroundColor: theme.backgroundSecondary }}
      >
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
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
    );
  }

  if (eventTypes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Event Types",
            headerBlurEffect: isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light",
            headerStyle: { backgroundColor: "transparent" },
            headerLargeTitleEnabled: true,
          }}
        />
        <View
          className="flex-1 items-center justify-center bg-gray-50 p-5"
          style={{ backgroundColor: theme.backgroundSecondary }}
        >
          <EmptyScreen
            icon="link-outline"
            headline="Create your first event type"
            description="Event types enable you to share links that show available times on your calendar and allow people to make bookings with you."
            buttonText="New"
            onButtonPress={handleOpenCreateModal}
          />
        </View>
      </>
    );
  }

  return (
    <>
      {/* iOS Native Header with Glass UI */}
      <Stack.Header
        style={{ backgroundColor: "transparent", shadowColor: "transparent" }}
        blurEffect={isLiquidGlassAvailable() ? undefined : isDark ? "dark" : "light"}
      >
        <Stack.Header.Title large>Event Types</Stack.Header.Title>

        <Stack.Header.Right>
          {/* Filter/Sort Menu */}
          <Stack.Header.Menu>
            <Stack.Header.Icon sf="line.3.horizontal.decrease" />

            {/* Sort by Submenu - opens as separate submenu */}
            <Stack.Header.Menu title="Sort by">
              <Stack.Header.MenuAction
                icon={sortBy === "alphabetical" ? "checkmark.circle.fill" : "textformat.abc"}
                onPress={() => handleSortByOption("alphabetical")}
              >
                Alphabetical
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={sortBy === "newest" ? "checkmark.circle.fill" : "calendar.badge.clock"}
                onPress={() => handleSortByOption("newest")}
              >
                Newest First
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={sortBy === "duration" ? "checkmark.circle.fill" : "clock"}
                onPress={() => handleSortByOption("duration")}
              >
                By Duration
              </Stack.Header.MenuAction>
            </Stack.Header.Menu>

            {/* Filter Submenu - multi-select toggles */}
            <Stack.Header.Menu
              title={`Filter${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
            >
              <Stack.Header.MenuAction
                icon={filters.hiddenOnly ? "checkmark.circle.fill" : "eye.slash"}
                onPress={() => handleFilterToggle("hiddenOnly")}
              >
                Hidden Only
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={filters.paidOnly ? "checkmark.circle.fill" : "dollarsign.circle"}
                onPress={() => handleFilterToggle("paidOnly")}
              >
                Paid Events
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={filters.seatedOnly ? "checkmark.circle.fill" : "person.2"}
                onPress={() => handleFilterToggle("seatedOnly")}
              >
                Seated Events
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={
                  filters.requiresConfirmationOnly ? "checkmark.circle.fill" : "checkmark.shield"
                }
                onPress={() => handleFilterToggle("requiresConfirmationOnly")}
              >
                Requires Confirmation
              </Stack.Header.MenuAction>
              <Stack.Header.MenuAction
                icon={filters.recurringOnly ? "checkmark.circle.fill" : "repeat"}
                onPress={() => handleFilterToggle("recurringOnly")}
              >
                Recurring
              </Stack.Header.MenuAction>
              {activeFilterCount > 0 && (
                <Stack.Header.MenuAction icon="xmark.circle" onPress={resetFilters}>
                  Clear All Filters
                </Stack.Header.MenuAction>
              )}
            </Stack.Header.Menu>
          </Stack.Header.Menu>

          {/* Profile Button - Opens bottom sheet */}
          {userProfile?.avatarUrl ? (
            <Stack.Header.View>
              <Pressable onPress={() => router.push("/profile-sheet")}>
                <Image
                  source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              </Pressable>
            </Stack.Header.View>
          ) : (
            <Stack.Header.Button onPress={() => router.push("/profile-sheet")}>
              <Stack.Header.Icon sf="person.circle.fill" />
            </Stack.Header.Button>
          )}
        </Stack.Header.Right>

        {/* Search Bar */}
        <Stack.Header.SearchBar
          placeholder="Search event types"
          onChangeText={(e) => handleSearch(e.nativeEvent.text)}
          obscureBackground={false}
          barTintColor={isDark ? "#171717" : "#fff"}
        />
      </Stack.Header>

      {/* Event Types List */}
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {refreshing ? (
          <EventTypeListSkeleton />
        ) : filteredEventTypes.length === 0 && searchQuery.trim() !== "" ? (
          <View
            className="flex-1 items-center justify-center bg-gray-50 p-5 pt-20"
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <EmptyScreen
              icon="search-outline"
              headline={`No results found for "${searchQuery}"`}
              description="Try searching with different keywords"
            />
          </View>
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
              className="overflow-hidden rounded-lg"
              style={{
                backgroundColor: theme.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.border,
              }}
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

      {/* Floating Action Button for New Event Type with Glass UI Menu */}
      <View className="absolute right-6" style={{ bottom: 100 }}>
        <TouchableOpacity
          onPress={handleOpenCreateModal}
          className="h-14 w-14 items-center justify-center rounded-full bg-black shadow-lg shadow-black/20 dark:bg-white"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color={isDark ? "#000000" : "#FFFFFF"} />
        </TouchableOpacity>
      </View>
    </>
  );
}
