import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActionSheetIOS,
  Share,
  Alert,
  Clipboard,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ContextMenu, Host, Button } from "@expo/ui/swift-ui";
import { PanGestureHandler, State } from "react-native-gesture-handler";

import { CalComAPIService, EventType } from "../../services/calcom";
import { Header } from "../../components/Header";
import { Tooltip } from "../../components/Tooltip";
import { slugify } from "../../utils/slugify";

export default function EventTypes() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [filteredEventTypes, setFilteredEventTypes] = useState<EventType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Modal state for creating new event type
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventSlug, setNewEventSlug] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventDuration, setNewEventDuration] = useState("15");
  const [username, setUsername] = useState<string>("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
  // Modal state for web platform action sheet
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  
  // Modal state for New button menu
  const [showNewModal, setShowNewModal] = useState(false);
  
  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal state for one-off meeting
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectionRanges, setSelectionRanges] = useState<Array<{
    id: string;
    startDay: number;
    endDay: number;
    startHour: number;
    endHour: number;
    startMinute: number;
    endMinute: number;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDragRange, setCurrentDragRange] = useState<{
    startDay: number;
    endDay: number;
    startHour: number;
    endHour: number;
    startMinute: number;
    endMinute: number;
  } | null>(null);
  const [dragStart, setDragStart] = useState<{day: number, hour: number, minute: number} | null>(null);
  const [calendarLayout, setCalendarLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch username on mount
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const fetchedUsername = await CalComAPIService.getUsername();
        setUsername(fetchedUsername);
      } catch (error) {
        console.error("Failed to fetch username:", error);
        // Keep default username if fetch fails
      }
    };
    fetchUsername();
  }, []);

  const fetchEventTypes = async () => {
    try {
      setError(null);

      const data = await CalComAPIService.getEventTypes();

      if (isMountedRef.current) {
        if (Array.isArray(data)) {
          setEventTypes(data);
          setFilteredEventTypes(data);
        } else {
          setEventTypes([]);
          setFilteredEventTypes([]);
        }
      }
    } catch (err) {
      console.error("🎯 EventTypesScreen: Error fetching event types:", err);
      if (isMountedRef.current) {
        setError("Failed to load event types. Please check your API key and try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  useEffect(() => {}, [loading, error, eventTypes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventTypes();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredEventTypes(eventTypes);
    } else {
      const filtered = eventTypes.filter(
        (eventType) =>
          eventType.title.toLowerCase().includes(query.toLowerCase()) ||
          (eventType.description && eventType.description.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredEventTypes(filtered);
    }
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes || minutes <= 0) {
      return "0m";
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getDuration = (eventType: EventType): number => {
    // Prefer lengthInMinutes (API field), fallback to length for backwards compatibility
    return eventType.lengthInMinutes ?? eventType.length ?? 0;
  };

  const normalizeMarkdown = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Remove HTML tags including <br>, <div>, <p>, etc.
        .replace(/<[^>]*>/g, " ")
        // Convert HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        // Convert markdown links [text](url) to just text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Remove bold/italic markers **text** or *text*
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        // Remove inline code `text`
        .replace(/`([^`]+)`/g, "$1")
        // Remove strikethrough ~~text~~
        .replace(/~~([^~]+)~~/g, "$1")
        // Remove heading markers # ## ###
        .replace(/^#{1,6}\s+/gm, "")
        // Remove blockquote markers >
        .replace(/^>\s+/gm, "")
        // Remove list markers - * +
        .replace(/^[\s]*[-*+]\s+/gm, "")
        // Remove numbered list markers 1. 2. etc
        .replace(/^[\s]*\d+\.\s+/gm, "")
        // Normalize multiple whitespace/newlines to single space
        .replace(/\s+/g, " ")
        // Trim whitespace
        .trim()
    );
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
      Clipboard.setString(link);
      
      if (Platform.OS === "web") {
        showToastMessage("Link copied!", eventType.id);
      } else {
        Alert.alert("Link Copied", "Event type link copied to clipboard");
      }
    } catch (error) {
      if (Platform.OS === "web") {
        showToastMessage("Failed to copy link");
      } else {
        Alert.alert("Error", "Failed to copy link. Please try again.");
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
      Alert.alert("Error", "Failed to share link. Please try again.");
    }
  };

  const handleEdit = (eventType: EventType) => {
    const duration = getDuration(eventType);
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

  const confirmDelete = async () => {
    if (!eventTypeToDelete) return;

    setIsDeleting(true);
    try {
      await CalComAPIService.deleteEventType(eventTypeToDelete.id);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Remove the deleted event type from local state
        const updatedEventTypes = eventTypes.filter((et) => et.id !== eventTypeToDelete.id);
        setEventTypes(updatedEventTypes);
        setFilteredEventTypes(updatedEventTypes);

        // Close modal and reset state
        setShowDeleteModal(false);
        setEventTypeToDelete(null);

        if (Platform.OS === "web") {
          showToastMessage("Event type deleted successfully");
        } else {
          Alert.alert("Success", "Event type deleted successfully");
        }
      }
    } catch (error) {
      console.error("Failed to delete event type:", error);
      if (isMountedRef.current) {
        if (Platform.OS === "web") {
          showToastMessage("Failed to delete event type");
        } else {
          Alert.alert("Error", "Failed to delete event type. Please try again.");
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (eventType: EventType) => {
    try {
      // Generate a new title and slug for the duplicate
      const newTitle = `${eventType.title} (copy)`;
      let newSlug = `${eventType.slug}-copy`;
      
      // Check if slug already exists and append a number if needed
      let counter = 1;
      while (eventTypes.some(et => et.slug === newSlug)) {
        newSlug = `${eventType.slug}-copy-${counter}`;
        counter++;
      }

      const duration = getDuration(eventType);
      
      // Create the duplicate event type
      const duplicatedEventType = await CalComAPIService.createEventType({
        title: newTitle,
        slug: newSlug,
        lengthInMinutes: duration,
        description: eventType.description || undefined,
      });

      // Refresh the list
      await fetchEventTypes();

      if (Platform.OS === "web") {
        showToastMessage("Event type duplicated successfully");
      } else {
        Alert.alert("Success", "Event type duplicated successfully");
      }

      // Navigate to edit the newly created duplicate
      router.push({
        pathname: "/event-type-detail",
        params: {
          id: duplicatedEventType.id.toString(),
          title: duplicatedEventType.title,
          description: duplicatedEventType.description || "",
          duration: (duplicatedEventType.lengthInMinutes || duplicatedEventType.length || duration).toString(),
          slug: duplicatedEventType.slug || "",
        },
      });
    } catch (error) {
      console.error("Failed to duplicate event type:", error);
      if (Platform.OS === "web") {
        showToastMessage("Failed to duplicate event type");
      } else {
        Alert.alert("Error", "Failed to duplicate event type. Please try again.");
      }
    }
  };

  const handlePreview = async (eventType: EventType) => {
    try {
      const link = await CalComAPIService.buildEventTypeLink(eventType.slug);
      // Open in browser
      if (Platform.OS === "web") {
        window.open(link, "_blank");
      } else {
        // For mobile, use Linking
        await Linking.openURL(link);
      }
    } catch (error) {
      console.error("Failed to open preview:", error);
      if (Platform.OS === "web") {
        showToastMessage("Failed to open preview");
      } else {
        Alert.alert("Error", "Failed to open preview. Please try again.");
      }
    }
  };

  const handleCreateNew = () => {
    if (Platform.OS === "web") {
      // Show custom modal for web platform
      setShowNewModal(true);
      return;
    }
    
    if (Platform.OS === "ios") {
      // iOS ActionSheet for Expo Go compatibility
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "New Event Type", "One-off meeting"],
          cancelButtonIndex: 0,
          title: "New",
          message: "Choose what to create",
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1: // New Event Type
              setShowCreateModal(true);
              break;
            case 2: // One-off meeting
              handleOneOffMeeting();
              break;
            default:
              // Cancel - do nothing
              break;
          }
        }
      );
      return;
    }
    
    // Fallback for Android
    Alert.alert("New", "Choose what to create", [
      { text: "Cancel", style: "cancel" },
      { text: "New Event Type", onPress: () => setShowCreateModal(true) },
      { text: "One-off meeting", onPress: handleOneOffMeeting },
    ]);
  };

  const handleOneOffMeeting = () => {
    setShowOneOffModal(true);
  };

  // Calendar helper functions
  const formatTime24 = (hour: number, minute: number = 0) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const minuteToY = (minute: number, hourHeight: number) => {
    return (minute / 60) * hourHeight;
  };

  const yToMinute = (y: number, hourHeight: number) => {
    const rawMinute = (y / hourHeight) * 60;
    return Math.round(rawMinute / 15) * 15; // Round to nearest 15 minutes
  };

  const generateRangeId = () => `range-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const normalizeRange = (startDay: number, startHour: number, startMinute: number, endDay: number, endHour: number, endMinute: number) => {
    // Ensure start is always before end
    const start = { day: startDay, hour: startHour, minute: startMinute };
    const end = { day: endDay, hour: endHour, minute: endMinute };
    
    if (start.day > end.day || 
        (start.day === end.day && start.hour > end.hour) ||
        (start.day === end.day && start.hour === end.hour && start.minute > end.minute)) {
      return {
        startDay: end.day,
        startHour: end.hour,
        startMinute: end.minute,
        endDay: start.day,
        endHour: start.hour,
        endMinute: start.minute
      };
    }
    
    return {
      startDay: start.day,
      startHour: start.hour,
      startMinute: start.minute,
      endDay: end.day,
      endHour: end.hour,
      endMinute: end.minute
    };
  };

  const handleDragStart = (day: number, hour: number, minute: number) => {
    setIsDragging(true);
    setDragStart({ day, hour, minute });
    setCurrentDragRange({
      startDay: day,
      endDay: day,
      startHour: hour,
      endHour: hour,
      startMinute: minute,
      endMinute: minute
    });
  };

  const handleDragMove = (day: number, hour: number, minute: number) => {
    if (!isDragging || !dragStart) return;
    
    const normalized = normalizeRange(
      dragStart.day, dragStart.hour, dragStart.minute,
      day, hour, minute
    );
    
    setCurrentDragRange(normalized);
  };

  const handleDragEnd = () => {
    if (currentDragRange && isDragging) {
      // Add the completed range to selection ranges
      setSelectionRanges(prev => [...prev, {
        id: generateRangeId(),
        ...currentDragRange
      }]);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setCurrentDragRange(null);
  };

  const removeRange = (rangeId: string) => {
    setSelectionRanges(prev => prev.filter(range => range.id !== rangeId));
  };

  const isPointInRange = (day: number, hour: number, minute: number, range: any) => {
    return day >= range.startDay && day <= range.endDay &&
           hour >= range.startHour && hour <= range.endHour &&
           minute >= range.startMinute && minute <= range.endMinute;
  };

  const getRangeAtPosition = (day: number, hour: number, minute: number) => {
    return selectionRanges.find(range => isPointInRange(day, hour, minute, range));
  };

  const handleCellClick = (day: number, hour: number, minute: number) => {
    const existingRange = getRangeAtPosition(day, hour, minute);
    if (existingRange) {
      removeRange(existingRange.id);
    }
  };

  const handleScheduleOneOff = () => {
    if (selectionRanges.length === 0) {
      Alert.alert("Error", "Please select at least one time slot");
      return;
    }
    
    const totalSlots = selectionRanges.reduce((total, range) => {
      const startTime = range.startDay * 1440 + range.startHour * 60 + range.startMinute;
      const endTime = range.endDay * 1440 + range.endHour * 60 + range.endMinute;
      return total + Math.ceil((endTime - startTime) / 15);
    }, 0);
    
    const weekDays = getWeekDays(selectedWeek);
    const rangeDescriptions = selectionRanges.map(range => {
      const startDay = weekDays[range.startDay];
      const endDay = weekDays[range.endDay];
      const startTime = formatTime24(range.startHour, range.startMinute);
      const endTime = formatTime24(range.endHour, range.endMinute);
      
      if (range.startDay === range.endDay) {
        return `${startDay.toLocaleDateString()} ${startTime} - ${endTime}`;
      } else {
        return `${startDay.toLocaleDateString()} ${startTime} - ${endDay.toLocaleDateString()} ${endTime}`;
      }
    }).join('\n');
    
    Alert.alert(
      "One-off Meeting Scheduled", 
      `Selected time ranges:\n${rangeDescriptions}\n\n${totalSlots} time slots total`,
      [
        { text: "OK", onPress: () => {
          setShowOneOffModal(false);
          setSelectionRanges([]);
        }}
      ]
    );
  };

  const clearSelection = () => {
    setSelectionRanges([]);
  };

  // Convert screen coordinates to calendar position
  const screenToCalendarPosition = (x: number, y: number) => {
    if (!calendarLayout) return { day: 0, hour: 0, minute: 0 };
    
    const timeColumnWidth = 80;
    const headerHeight = 60;
    const dayWidth = (calendarLayout.width - timeColumnWidth) / 7;
    const hourHeight = 60;
    
    const relativeX = x - calendarLayout.x;
    const relativeY = y - calendarLayout.y;
    
    const dayColumnX = relativeX - timeColumnWidth;
    const dayIndex = Math.max(0, Math.min(6, Math.floor(dayColumnX / dayWidth)));
    
    const gridY = relativeY - headerHeight;
    const hour = Math.max(0, Math.min(23, Math.floor(gridY / hourHeight)));
    
    const minuteWithinHour = gridY % hourHeight;
    const minute = Math.floor((minuteWithinHour / hourHeight) * 4) * 15;
    
    return { day: dayIndex, hour, minute: Math.max(0, Math.min(45, minute)) };
  };

  const isSlotSelected = (day: number, hour: number, minute: number) => {
    return selectionRanges.some(range => isPointInRange(day, hour, minute, range)) ||
           (currentDragRange && isPointInRange(day, hour, minute, currentDragRange));
  };

  const getHourSelectionStyle = (day: number, hour: number) => {
    const hasSelection = Array.from({ length: 4 }, (_, i) => i * 15)
      .some(minute => isSlotSelected(day, hour, minute));
    return hasSelection ? '#EBF4FF' : 'transparent';
  };

  const handleHourPress = (day: number, hour: number) => {
    const existingRange = getRangeAtPosition(day, hour, 0);
    if (existingRange) {
      removeRange(existingRange.id);
    } else {
      handleDragStart(day, hour, 0);
      handleDragMove(day, hour, 45);
      handleDragEnd();
    }
  };

  const handleGlobalDragStart = (x: number, y: number) => {
    const position = screenToCalendarPosition(x, y);
    handleDragStart(position.day, position.hour, position.minute);
  };

  const handleGlobalDragMove = (x: number, y: number) => {
    if (!isDragging) return;
    
    const currentPosition = screenToCalendarPosition(x, y);
    handleDragMove(currentPosition.day, currentPosition.hour, currentPosition.minute);
  };

  const handleGlobalDragEnd = () => {
    handleDragEnd();
  };

  const handleCreateEventType = async () => {
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

    setCreating(true);
    try {
      // Create the event type with the form data
      const newEventType = await CalComAPIService.createEventType({
        title: newEventTitle.trim(),
        slug: newEventSlug.trim(),
        lengthInMinutes: duration,
        description: newEventDescription.trim() || undefined,
      });

      // Close modal and reset form
      setShowCreateModal(false);
      setNewEventTitle("");
      setNewEventSlug("");
      setNewEventDescription("");
      setNewEventDuration("15");
      setIsSlugManuallyEdited(false);

      // Refresh the list
      await fetchEventTypes();

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
    } catch (error) {
      console.error("Failed to create event type:", error);
      Alert.alert("Error", "Failed to create event type. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const renderEventType = ({ item, index }: { item: EventType; index: number }) => {
    const duration = getDuration(item);
    const isLast = index === filteredEventTypes.length - 1;

    return (
      <TouchableOpacity
        className={`bg-white active:bg-[#F8F9FA] ${!isLast ? "border-b border-[#E5E5EA]" : ""}`}
        onPress={() => handleEventTypePress(item)}
        onLongPress={() => handleEventTypeLongPress(item)}
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Text className="text-base font-semibold text-[#333] flex-1">{item.title}</Text>
            </View>
            {item.description && (
              <Text className="text-sm text-[#666] leading-5 mt-0.5 mb-2" numberOfLines={2}>
                {normalizeMarkdown(item.description)}
              </Text>
            )}
            <View className="bg-[#E5E5EA] border border-[#E5E5EA] rounded-lg px-2 py-1 mt-2 flex-row items-center self-start">
              <Ionicons name="time-outline" size={14} color="#000" />
              <Text className="text-xs text-black font-semibold ml-1.5">{formatDuration(duration)}</Text>
            </View>
            {(item.price != null && item.price > 0) || item.requiresConfirmation ? (
              <View className="flex-row items-center mt-2 gap-3">
                {item.price != null && item.price > 0 && (
                  <Text className="text-sm font-medium text-[#34C759]">
                    {item.currency || "$"}
                    {item.price}
                  </Text>
                )}
                {item.requiresConfirmation && (
                  <View className="bg-[#FF9500] px-2 py-0.5 rounded">
                    <Text className="text-xs font-medium text-white">Requires Confirmation</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
          <View className="flex-row">
            <Tooltip text="Preview">
              <TouchableOpacity
                className="items-center justify-center border border-[#E5E5EA] border-r-0 rounded-l-lg"
                style={{ width: 32, height: 32 }}
                onPress={() => handlePreview(item)}
              >
                <Ionicons 
                  name="open-outline" 
                  size={18} 
                  color="#3C3F44" 
                />
              </TouchableOpacity>
            </Tooltip>
            <Tooltip text={copiedEventTypeId === item.id ? "Copied!" : "Copy link"}>
              <TouchableOpacity
                className="items-center justify-center border border-[#E5E5EA] border-r-0"
                style={{ width: 32, height: 32 }}
                onPress={() => handleCopyLink(item)}
              >
                {copiedEventTypeId === item.id ? (
                  <Ionicons 
                    name="checkmark" 
                    size={18} 
                    color="#10B981" 
                  />
                ) : (
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </Svg>
                )}
              </TouchableOpacity>
            </Tooltip>
            <Tooltip text="More">
              <TouchableOpacity
                className="items-center justify-center border border-[#E5E5EA] rounded-r-lg"
                style={{ width: 32, height: 32 }}
                onPress={() => handleEventTypeLongPress(item)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#3C3F44" />
              </TouchableOpacity>
            </Tooltip>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-4 text-base text-gray-500">Loading event types...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-5">
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text className="mt-4 mb-2 text-center text-xl font-bold text-gray-800">
          Unable to load event types
        </Text>
        <Text className="mb-6 text-center text-base text-gray-500">{error}</Text>
        <TouchableOpacity className="rounded-lg bg-black px-6 py-3" onPress={fetchEventTypes}>
          <Text className="text-base font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <View className="flex-1 bg-gray-100 pt-[54px]">
        <View className="bg-gray-100 px-2 md:px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Search event types"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-gray-800">No event types found</Text>
          <Text className="text-base text-gray-500 text-center">Create your first event type in Cal.com</Text>
        </View>
      </View>
    );
  }

  if (filteredEventTypes.length === 0 && searchQuery.trim() !== "") {
    return (
      <View className="flex-1 bg-gray-100">
        <Header />
        <View className="bg-gray-100 px-2 md:px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
          <TextInput
            className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Search event types"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <View className="flex-1 justify-center items-center p-5 bg-gray-50">
          <Ionicons name="search-outline" size={64} color="#666" />
          <Text className="text-xl font-bold mt-4 mb-2 text-gray-800">No results found</Text>
          <Text className="text-base text-gray-500 text-center">Try searching with different keywords</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <Header />
      <View className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex-row items-center gap-3">
        <TextInput
          className="flex-1 bg-white rounded-lg px-3 py-2 text-[17px] text-black border border-gray-200 focus:ring-2 focus:ring-black focus:border-black"
          placeholder="Search event types"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity className="flex-row items-center justify-center gap-1 bg-black px-2.5 py-2 rounded-lg min-w-[60px]" onPress={handleCreateNew}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-base font-semibold">New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        <View className="px-2 md:px-4 pt-4">
          <View className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
            {filteredEventTypes.map((item, index) => (
              <View key={item.id.toString()}>
                {renderEventType({ item, index })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Create Event Type Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View
            className="bg-white rounded-2xl w-[90%] max-w-[500px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 24,
            }}>
            {/* Header */}
            <View className="px-8 pt-6 pb-4">
              <Text className="text-2xl font-semibold text-[#111827] mb-2">Add a new event type</Text>
              <Text className="text-sm text-[#6B7280]">
                Set up event types to offer different types of meetings.
              </Text>
            </View>

            {/* Content */}
            <ScrollView className="px-8 pb-6" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-[#374151] mb-2">Title</Text>
                <TextInput
                  className="bg-white rounded-md px-3 py-2.5 text-base text-[#111827] border border-[#D1D5DB] focus:ring-2 focus:ring-black focus:border-black"
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
                <Text className="text-sm font-medium text-[#374151] mb-2">URL</Text>
                <View className="flex-row items-center bg-white rounded-md border border-[#D1D5DB] focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                  <Text className="text-base text-[#6B7280] px-3">https://cal.com/{username}/</Text>
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
                <Text className="text-sm font-medium text-[#374151] mb-2">Description</Text>
                <TextInput
                  className="bg-white rounded-md px-3 py-2.5 text-base text-[#111827] border border-[#D1D5DB] focus:ring-2 focus:ring-black focus:border-black"
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
                <Text className="text-sm font-medium text-[#374151] mb-2">Duration</Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="bg-white rounded-md px-3 py-2.5 text-base text-[#111827] border border-[#D1D5DB] w-20 text-center focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="15"
                    placeholderTextColor="#9CA3AF"
                    value={newEventDuration}
                    onChangeText={setNewEventDuration}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleCreateEventType}
                  />
                  <Text className="text-base text-[#6B7280] ml-3">minutes</Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="bg-[#F9FAFB] border-t border-[#E5E7EB] rounded-b-2xl px-8 py-4">
              <View className="flex-row justify-end space-x-2 gap-2">
                <TouchableOpacity
                  className="px-4 py-2 rounded-xl bg-white border border-[#D1D5DB]"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewEventTitle("");
                    setNewEventSlug("");
                    setNewEventDescription("");
                    setNewEventDuration("15");
                    setIsSlugManuallyEdited(false);
                  }}
                  disabled={creating}>
                  <Text className="text-base font-medium text-[#374151]">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-4 py-2 bg-[#111827] rounded-xl ${creating ? "opacity-60" : ""}`}
                  onPress={handleCreateEventType}
                  disabled={creating}>
                  <Text className="text-base font-medium text-white">
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action Modal for Web Platform */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowActionModal(false);
          setSelectedEventType(null);
        }}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-2 md:p-4"
          activeOpacity={1}
          onPress={() => {
            setShowActionModal(false);
            setSelectedEventType(null);
          }}>
          <TouchableOpacity
            className="bg-white rounded-2xl w-full max-w-sm mx-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            {selectedEventType && (
              <>
                <View className="p-6 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedEventType.title}
                  </Text>
                  {selectedEventType.description && (
                    <Text className="text-sm text-gray-600">
                      {normalizeMarkdown(selectedEventType.description)}
                    </Text>
                  )}
                </View>
                
                <View className="p-2">
                  <TouchableOpacity
                    className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleEdit(eventType);
                    }}>
                    <Ionicons name="pencil-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDuplicate(eventType);
                    }}>
                    <Ionicons name="copy-outline" size={20} color="#6B7280" />
                    <Text className="ml-3 text-base text-gray-900">Duplicate</Text>
                  </TouchableOpacity>
                  
                  {/* Separator before delete button */}
                  <View className="h-px bg-gray-200 my-2" />
                  
                  <TouchableOpacity
                    className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
                    onPress={() => {
                      setShowActionModal(false);
                      const eventType = selectedEventType;
                      setSelectedEventType(null);
                      if (eventType) handleDelete(eventType);
                    }}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text className="ml-3 text-base text-red-500">Delete</Text>
                  </TouchableOpacity>
                </View>
                
                <View className="p-2 md:p-4 border-t border-gray-200">
                  <TouchableOpacity
                    className="w-full p-3 bg-gray-100 rounded-lg"
                    onPress={() => {
                      setShowActionModal(false);
                      setSelectedEventType(null);
                    }}>
                    <Text className="text-center text-base font-medium text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* New Menu Modal for Web Platform */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center p-2 md:p-4"
          activeOpacity={1}
          onPress={() => setShowNewModal(false)}>
          <TouchableOpacity
            className="bg-white rounded-2xl w-full max-w-sm mx-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <View className="p-6 border-b border-gray-200">
              <Text className="text-xl font-semibold text-gray-900">
                New
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Choose what to create
              </Text>
            </View>
            
            {/* Options List */}
            <View className="p-2">
              {/* New Event Type */}
              <TouchableOpacity
                onPress={() => {
                  setShowNewModal(false);
                  setShowCreateModal(true);
                }}
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">New Event Type</Text>
              </TouchableOpacity>

              {/* Separator */}
              <View className="h-px bg-gray-200 mx-4 my-2" />

              {/* One-off meeting */}
              <TouchableOpacity
                onPress={() => {
                  setShowNewModal(false);
                  handleOneOffMeeting();
                }}
                className="flex-row items-center p-2 md:p-4 hover:bg-gray-50"
              >
                <Ionicons name="videocam-outline" size={20} color="#6B7280" />
                <Text className="ml-3 text-base text-gray-900">One-off meeting</Text>
              </TouchableOpacity>
            </View>
            
            {/* Cancel button */}
            <View className="p-2 md:p-4 border-t border-gray-200">
              <TouchableOpacity
                className="w-full p-3 bg-gray-100 rounded-lg"
                onPress={() => setShowNewModal(false)}>
                <Text className="text-center text-base font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* One-off Meeting Modal */}
      <Modal
        visible={showOneOffModal}
        transparent={Platform.OS !== "web"}
        animationType="fade"
        onRequestClose={() => setShowOneOffModal(false)}>
        <View 
          className={Platform.OS === "web" ? "absolute inset-0 z-50 bg-white" : "flex-1 bg-black/50"}
          style={Platform.OS === "web" ? { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 50 
          } : {}}
        >
          {Platform.OS === "web" ? (() => {
            const weekDays = getWeekDays(selectedWeek);
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const timeSlots = Array.from({ length: 288 }, (_, i) => i); // 24 hours * 12 (5-min slots)

            return (
              <View className="h-full flex flex-col">
                {/* Web Header */}
                <View className="bg-white border-b border-gray-200 px-6 py-4 flex-row items-center justify-between">
                  <View>
                    <Text className="text-2xl font-semibold text-gray-900">Schedule One-off Meeting</Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      Week of {weekDays[0].toLocaleDateString()} - {selectionRanges.length} ranges selected
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={clearSelection}
                      className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      <Text className="text-sm text-gray-600">Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowOneOffModal(false)}
                      className="p-2 rounded-full hover:bg-gray-100"
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Main Content Area with Calendar and Sidebar */}
                <View className="flex-1 flex-row">
                  {/* Calendar Grid */}
                  <View className="flex-1">
                    <ScrollView className="flex-1">
                    <PanGestureHandler
                      onHandlerStateChange={(event) => {
                        const { state, x, y } = event.nativeEvent;
                        
                        if (state === State.BEGAN) {
                          handleGlobalDragStart(x, y);
                        } else if (state === State.END || state === State.CANCELLED) {
                          handleGlobalDragEnd();
                        }
                      }}
                      onGestureEvent={(event) => {
                        if (isDragging) {
                          const { x, y } = event.nativeEvent;
                          handleGlobalDragMove(x, y);
                        }
                      }}
                    >
                      <View 
                        style={{ minWidth: 800 }}
                        onLayout={(event) => {
                          const { x, y, width, height } = event.nativeEvent.layout;
                          setCalendarLayout({ x, y, width, height });
                        }}
                      >
                      {/* Day Headers */}
                      <View className="flex-row border-b border-gray-300 bg-gray-50">
                        <View style={{ width: 80 }} className="p-2 border-r border-gray-300">
                          <Text className="text-xs font-medium text-gray-500">Time</Text>
                        </View>
                        {weekDays.map((day, dayIndex) => (
                          <View key={dayIndex} style={{ flex: 1, minWidth: 100 }} className="p-2 border-r border-gray-300">
                            <Text className="text-xs font-medium text-gray-900 text-center">
                              {dayNames[day.getDay()]}
                            </Text>
                            <Text className="text-xs text-gray-500 text-center">
                              {day.getDate()}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Time Grid - One block per hour */}
                      {Array.from({ length: 24 }, (_, hour) => (
                        <View key={hour} className="flex-row border-b border-gray-200">
                          {/* Time Label */}
                          <View 
                            style={{ width: 80, height: 60 }} 
                            className="border-r border-gray-300 flex justify-center px-2"
                          >
                            <Text className="text-sm font-medium text-gray-600">
                              {formatTime24(hour)}
                            </Text>
                          </View>
                          
                          {/* Day Hour Blocks */}
                          {weekDays.map((day, dayIndex) => {
                            const hourHeight = 60;
                            
                            return (
                              <View 
                                key={`${dayIndex}-${hour}`}
                                style={{ 
                                  flex: 1, 
                                  minWidth: 100, 
                                  height: hourHeight,
                                  position: 'relative',
                                  backgroundColor: getHourSelectionStyle(dayIndex, hour)
                                }}
                                className="border-r border-gray-100"
                              >
                                <TouchableOpacity
                                  style={{ 
                                    width: '100%',
                                    height: hourHeight,
                                  }}
                                  onPress={() => handleHourPress(dayIndex, hour)}
                                  activeOpacity={0.7}
                                >
                                  {/* 15-minute indicators */}
                                  {Array.from({ length: 4 }, (_, quarterIndex) => {
                                    const minute = quarterIndex * 15;
                                    
                                    return (
                                      <View
                                        key={minute}
                                        style={{
                                          position: 'absolute',
                                          top: minuteToY(minute, hourHeight),
                                          left: 0,
                                          right: 0,
                                          height: hourHeight / 4,
                                          borderTopWidth: 1,
                                          borderTopColor: '#E5E7EB',
                                        }}
                                      />
                                    );
                                  })}
                                  
                                  {/* Selection rectangles overlay */}
                                  {[...selectionRanges, ...(currentDragRange ? [{ id: 'current', ...currentDragRange }] : [])].map((range, index) => {
                                    // Check if this hour block intersects with the range
                                    if (dayIndex >= range.startDay && dayIndex <= range.endDay &&
                                        hour >= range.startHour && hour <= range.endHour) {
                                      
                                      // Calculate the actual start and end positions within this hour block
                                      const blockStartMinute = (dayIndex === range.startDay && hour === range.startHour) 
                                        ? range.startMinute : 0;
                                      const blockEndMinute = (dayIndex === range.endDay && hour === range.endHour) 
                                        ? range.endMinute : 60;
                                      
                                      const topOffset = minuteToY(blockStartMinute, hourHeight);
                                      const height = minuteToY(blockEndMinute - blockStartMinute, hourHeight);
                                      
                                      return (
                                        <TouchableOpacity
                                          key={`${range.id}-${dayIndex}-${hour}`}
                                          style={{
                                            position: 'absolute',
                                            top: topOffset,
                                            left: 2,
                                            right: 2,
                                            height: height,
                                            backgroundColor: range.id === 'current' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.5)',
                                            borderWidth: 1,
                                            borderColor: range.id === 'current' ? '#3B82F6' : '#22C55E',
                                            borderRadius: 4,
                                            zIndex: 1
                                          }}
                                          onPress={() => {
                                            if (range.id !== 'current') {
                                              handleCellClick(dayIndex, hour, blockStartMinute);
                                            }
                                          }}
                                          activeOpacity={0.8}
                                        />
                                      );
                                    }
                                    return null;
                                  })}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                      </View>
                    </PanGestureHandler>
                    </ScrollView>
                  </View>
                  
                  {/* Right Sidebar */}
                  <View className="w-80 border-l border-gray-200 bg-gray-50">
                    <View className="px-4 py-3 border-b border-gray-200 bg-white">
                      <Text className="text-lg font-semibold text-gray-900">Selected Ranges</Text>
                      <Text className="text-sm text-gray-500">{selectionRanges.length} range{selectionRanges.length !== 1 ? 's' : ''} selected</Text>
                    </View>
                    
                    <ScrollView className="flex-1 px-4 py-2">
                      {selectionRanges.length === 0 ? (
                        <View className="flex-1 justify-center items-center py-8">
                          <Ionicons name="time-outline" size={48} color="#9CA3AF" />
                          <Text className="text-gray-500 text-center mt-3 text-sm">
                            Drag on the calendar to select time ranges
                          </Text>
                        </View>
                      ) : (
                        <View className="space-y-2">
                          {selectionRanges.map((range, index) => {
                            const startDay = weekDays[range.startDay];
                            const endDay = weekDays[range.endDay];
                            const startTime = formatTime24(range.startHour, range.startMinute);
                            const endTime = formatTime24(range.endHour, range.endMinute);
                            
                            const isSameDay = range.startDay === range.endDay;
                            const duration = Math.ceil(((range.endDay * 1440 + range.endHour * 60 + range.endMinute) - 
                                                       (range.startDay * 1440 + range.startHour * 60 + range.startMinute)) / 15) * 15;
                            const durationHours = Math.floor(duration / 60);
                            const durationMins = duration % 60;
                            const durationText = durationHours > 0 ? 
                              (durationMins > 0 ? `${durationHours}h ${durationMins}m` : `${durationHours}h`) : 
                              `${durationMins}m`;
                            
                            return (
                              <TouchableOpacity
                                key={range.id}
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:bg-gray-50 mb-2"
                                onPress={() => removeRange(range.id)}
                              >
                                <View className="flex-row items-center justify-between mb-2">
                                  <Text className="text-sm font-medium text-gray-900">Range {index + 1}</Text>
                                  <TouchableOpacity onPress={() => removeRange(range.id)}>
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                                
                                {isSameDay ? (
                                  <View>
                                    <Text className="text-sm text-gray-700 font-medium">
                                      {startDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>
                                    <Text className="text-sm text-gray-600">
                                      {startTime} - {endTime}
                                    </Text>
                                  </View>
                                ) : (
                                  <View>
                                    <Text className="text-sm text-gray-700">
                                      <Text className="font-medium">
                                        {startDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                      </Text>
                                      {' '}{startTime}
                                    </Text>
                                    <Text className="text-xs text-gray-500">to</Text>
                                    <Text className="text-sm text-gray-700">
                                      <Text className="font-medium">
                                        {endDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                      </Text>
                                      {' '}{endTime}
                                    </Text>
                                  </View>
                                )}
                                
                                <View className="mt-2 flex-row items-center">
                                  <View className="bg-green-100 px-2 py-1 rounded-full">
                                    <Text className="text-xs font-medium text-green-800">{durationText}</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* Footer */}
                <View className="border-t border-gray-200 p-4 bg-white">
                  <View className="flex-row justify-end gap-3">
                    <TouchableOpacity
                      className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
                      onPress={() => setShowOneOffModal(false)}
                    >
                      <Text className="text-gray-700 font-medium">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700"
                      onPress={handleScheduleOneOff}
                      disabled={selectionRanges.length === 0}
                      style={{ opacity: selectionRanges.length === 0 ? 0.5 : 1 }}
                    >
                      <Text className="text-white font-medium">
                        Schedule Meeting ({selectionRanges.length} ranges)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })() : (() => {
              const weekDays = getWeekDays(selectedWeek);
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

              return (
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  className="flex-1 justify-center items-center p-2"
                >
                  <View className="bg-white rounded-2xl w-full max-w-md h-[90%]">
                    {/* Mobile Header */}
                    <View className="px-4 pt-4 pb-3 border-b border-gray-200">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-semibold text-gray-900">Schedule Meeting</Text>
                        <TouchableOpacity onPress={() => setShowOneOffModal(false)}>
                          <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-xs text-gray-500 mt-1">
                        {selectionRanges.length} ranges selected
                      </Text>
                    </View>

                    {/* Mobile Calendar Grid */}
                    <View className="flex-1">
                      <ScrollView className="flex-1">
                        {/* Day Headers */}
                        <View className="flex-row border-b border-gray-300 bg-gray-50">
                          <View style={{ width: 40 }} className="p-1">
                            <Text className="text-xs text-gray-500">Time</Text>
                          </View>
                          {weekDays.map((day, dayIndex) => (
                            <View key={dayIndex} style={{ flex: 1 }} className="p-1 border-r border-gray-200">
                              <Text className="text-xs font-medium text-gray-900 text-center">
                                {dayNames[day.getDay()]}
                              </Text>
                              <Text className="text-xs text-gray-500 text-center">
                                {day.getDate()}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Time Grid - Simplified for mobile (hour blocks) */}
                        {Array.from({ length: 24 }, (_, hour) => (
                          <View key={hour} className="flex-row border-b border-gray-100">
                            {/* Time Label */}
                            <View style={{ width: 40, height: 40 }} className="border-r border-gray-200 justify-center px-1">
                              <Text className="text-xs text-gray-600">
                                {formatTime24(hour)}
                              </Text>
                            </View>
                            
                            {/* Day Hour Blocks */}
                            {weekDays.map((day, dayIndex) => {
                              return (
                                <View key={`${dayIndex}-${hour}`} style={{ flex: 1, height: 40, position: 'relative' }} className="border-r border-gray-100">
                                  <TouchableOpacity
                                    style={{ 
                                      flex: 1,
                                      backgroundColor: getHourSelectionStyle(dayIndex, hour)
                                    }}
                                    onPress={() => handleHourPress(dayIndex, hour)}
                                  />
                                  
                                  {/* Selection rectangles overlay for mobile */}
                                  {[...selectionRanges, ...(currentDragRange ? [{ id: 'current', ...currentDragRange }] : [])].map((range, index) => {
                                    if (dayIndex >= range.startDay && dayIndex <= range.endDay &&
                                        hour >= range.startHour && hour <= range.endHour) {
                                      
                                      return (
                                        <TouchableOpacity
                                          key={`${range.id}-${dayIndex}-${hour}`}
                                          style={{
                                            position: 'absolute',
                                            top: 2,
                                            left: 2,
                                            right: 2,
                                            bottom: 2,
                                            backgroundColor: range.id === 'current' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.5)',
                                            borderWidth: 1,
                                            borderColor: range.id === 'current' ? '#3B82F6' : '#22C55E',
                                            borderRadius: 2,
                                            zIndex: 1
                                          }}
                                          onPress={() => {
                                            if (range.id !== 'current') {
                                              handleCellClick(dayIndex, hour, 0);
                                            }
                                          }}
                                          activeOpacity={0.8}
                                        />
                                      );
                                    }
                                    return null;
                                  })}
                                </View>
                              );
                            })}
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Mobile Footer */}
                    <View className="px-4 py-3 border-t border-gray-200">
                      <TouchableOpacity
                        className="bg-blue-600 py-3 px-4 rounded-lg mb-2"
                        onPress={handleScheduleOneOff}
                      >
                        <Text className="text-white text-sm font-semibold text-center">
                          Schedule Meeting ({selectionRanges.length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="py-2 px-4"
                        onPress={clearSelection}
                      >
                        <Text className="text-gray-600 text-sm text-center">Clear Selection</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              );
            })()}
          </View>
        </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setEventTypeToDelete(null);
          }
        }}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header with icon and title */}
            <View className="p-6">
              <View className="flex-row">
                {/* Danger icon */}
                <View className="bg-red-50 rounded-full p-2 mr-3 self-start">
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                </View>
                
                {/* Title and description */}
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-gray-900 mb-2">
                    Delete Event Type
                  </Text>
                  <Text className="text-sm text-gray-600 leading-5">
                    {eventTypeToDelete && (
                      <>This will permanently delete the "{eventTypeToDelete.title}" event type. This action cannot be undone.</>
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer with buttons */}
            <View className="flex-row-reverse gap-2 px-6 pb-6 pt-2">
              <TouchableOpacity
                className={`px-4 py-2.5 rounded-lg bg-gray-900 ${isDeleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={isDeleting}>
                <Text className="text-white text-base font-medium text-center">
                  Delete
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white"
                onPress={() => {
                  setShowDeleteModal(false);
                  setEventTypeToDelete(null);
                }}
                disabled={isDeleting}>
                <Text className="text-gray-700 text-base font-medium text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast for Web Platform */}
      {showToast && (
        <View className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <View className="bg-gray-800 px-6 py-3 rounded-full shadow-lg">
            <Text className="text-white text-sm font-medium">{toastMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
