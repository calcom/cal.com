import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalComAPIService, type UserProfile } from "@/services/calcom";
import { getAvatarUrl } from "@/utils/getAvatarUrl";
import { CalComLogo } from "./CalComLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPressable } from "@/components/AppPressable";
import type { EventTypeFilters, EventTypeSortOption } from "@/hooks/useEventTypeFilter";

interface FilterOption {
  key: string;
  label: string;
}

interface EventTypeFilterConfig {
  sortBy: EventTypeSortOption;
  filters: EventTypeFilters;
  onSortChange: (sort: EventTypeSortOption) => void;
  onToggleFilter: (filterKey: keyof EventTypeFilters) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

interface HeaderProps {
  /** Optional: Filter options for dropdown menu (e.g., booking status filter) */
  filterOptions?: FilterOption[];
  /** Optional: Currently active filter key */
  activeFilter?: string;
  /** Optional: Callback when filter changes */
  onFilterChange?: (filterKey: string) => void;
  /** Optional: Event type filter/sort config for Android */
  eventTypeFilterConfig?: EventTypeFilterConfig;
}

export function Header({
  filterOptions,
  activeFilter,
  onFilterChange,
  eventTypeFilterConfig,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // iOS system colors for dark mode
  const colors = {
    text: isDark ? "#FFFFFF" : "#000000",
    textSecondary: isDark ? "#A3A3A3" : "#666666",
    background: isDark ? "#000000" : "#FFFFFF",
    border: isDark ? "#4D4D4D" : "#E5E5EA",
    logoColor: isDark ? "#FFFFFF" : "#333333",
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await CalComAPIService.getUserProfile();
      setUserProfile(profile);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch user profile");
      if (__DEV__) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.debug("[Header] fetchUserProfile failed", { message, stack });
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleProfile = () => {
    // Navigate to profile sheet on all platforms (Android, Web, Extension)
    router.push("/profile-sheet");
  };

  const activeFilterLabel =
    filterOptions?.find((opt) => opt.key === activeFilter)?.label ?? "Filter";

  return (
    <View
      className="flex-row items-center justify-between border-b border-[#E5E5EA] bg-white px-2 dark:border-[#4D4D4D] dark:bg-black md:px-4"
      style={{ paddingTop: insets.top + 4, paddingBottom: 4 }}
    >
      {/* Left: Cal.com Logo */}
      <View className="ms-1">
        <CalComLogo width={101} height={22} color={colors.logoColor} />
      </View>

      {/* Right: Filter Dropdown + Profile */}
      <View
        className="flex-row items-center gap-2"
        style={Platform.OS === "web" ? { marginRight: 8 } : {}}
      >
        {/* Booking status filter dropdown (for bookings page) */}
        {filterOptions && filterOptions.length > 0 && onFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppPressable className="h-10 flex-row items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 dark:border-[#262626] dark:bg-[#171717]">
                <Text className="text-[15px] font-medium text-[#000000] dark:text-white">
                  {activeFilterLabel}
                </Text>
              </AppPressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              insets={{ top: 60, bottom: 20, left: 12, right: 12 }}
              sideOffset={8}
              className="w-44"
              align="end"
            >
              {filterOptions.map((option) => {
                const isSelected = activeFilter === option.key;
                // Map filter keys to appropriate icons
                const getFilterIcon = (key: string) => {
                  switch (key) {
                    case "upcoming":
                      return "calendar-outline";
                    case "unconfirmed":
                      return "help-circle-outline";
                    case "recurring":
                      return "repeat-outline";
                    case "past":
                      return "checkmark-circle-outline";
                    case "cancelled":
                      return "close-circle-outline";
                    default:
                      return "calendar-outline";
                  }
                };

                return (
                  <DropdownMenuItem key={option.key} onPress={() => onFilterChange(option.key)}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : getFilterIcon(option.key)}
                        size={16}
                        color={isSelected ? colors.text : colors.textSecondary}
                      />
                      <Text
                        className={
                          isSelected
                            ? "text-base font-semibold text-[#000000] dark:text-white"
                            : "text-base dark:text-gray-300"
                        }
                      >
                        {option.label}
                      </Text>
                    </View>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Event type filter/sort menu (for event types page - Android and Web/Extension) */}
        {eventTypeFilterConfig && (Platform.OS === "android" || Platform.OS === "web") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppPressable className="relative p-2">
                <Ionicons name="options-outline" size={22} color={colors.text} />
                {/* Badge for active filters */}
                {eventTypeFilterConfig.activeFilterCount > 0 && (
                  <View
                    className="absolute -top-0.5 -right-0.5 items-center justify-center rounded-full bg-[#000000] dark:bg-white"
                    style={{ width: 16, height: 16 }}
                  >
                    <Text className="text-[10px] font-bold text-white dark:text-black">
                      {eventTypeFilterConfig.activeFilterCount}
                    </Text>
                  </View>
                )}
              </AppPressable>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              insets={{ top: 60, bottom: 20, left: 12, right: 12 }}
              sideOffset={8}
              className="w-56"
              align="end"
            >
              {/* Sort by Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="swap-vertical-outline" size={16} color={colors.textSecondary} />
                    <Text className="text-base dark:text-gray-300">Sort by</Text>
                  </View>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onPress={() => eventTypeFilterConfig.onSortChange("alphabetical")}
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={
                          eventTypeFilterConfig.sortBy === "alphabetical"
                            ? "checkmark-circle"
                            : "text-outline"
                        }
                        size={16}
                        color={
                          eventTypeFilterConfig.sortBy === "alphabetical"
                            ? colors.text
                            : colors.textSecondary
                        }
                      />
                      <Text
                        className={
                          eventTypeFilterConfig.sortBy === "alphabetical"
                            ? "text-base font-semibold text-[#000000] dark:text-white"
                            : "text-base dark:text-gray-300"
                        }
                      >
                        Alphabetical
                      </Text>
                    </View>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => eventTypeFilterConfig.onSortChange("newest")}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={
                          eventTypeFilterConfig.sortBy === "newest"
                            ? "checkmark-circle"
                            : "calendar-outline"
                        }
                        size={16}
                        color={
                          eventTypeFilterConfig.sortBy === "newest"
                            ? colors.text
                            : colors.textSecondary
                        }
                      />
                      <Text
                        className={
                          eventTypeFilterConfig.sortBy === "newest"
                            ? "text-base font-semibold text-[#000000] dark:text-white"
                            : "text-base dark:text-gray-300"
                        }
                      >
                        Newest First
                      </Text>
                    </View>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => eventTypeFilterConfig.onSortChange("duration")}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={
                          eventTypeFilterConfig.sortBy === "duration"
                            ? "checkmark-circle"
                            : "time-outline"
                        }
                        size={16}
                        color={
                          eventTypeFilterConfig.sortBy === "duration"
                            ? colors.text
                            : colors.textSecondary
                        }
                      />
                      <Text
                        className={
                          eventTypeFilterConfig.sortBy === "duration"
                            ? "text-base font-semibold text-[#000000] dark:text-white"
                            : "text-base dark:text-gray-300"
                        }
                      >
                        By Duration
                      </Text>
                    </View>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Filter Label */}
              <DropdownMenuLabel>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="filter-outline" size={16} color={colors.textSecondary} />
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Filters
                  </Text>
                </View>
              </DropdownMenuLabel>

              {/* Filter Toggles (multi-select) */}
              <DropdownMenuItem onPress={() => eventTypeFilterConfig.onToggleFilter("hiddenOnly")}>
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={
                      eventTypeFilterConfig.filters.hiddenOnly
                        ? "checkmark-circle"
                        : "eye-off-outline"
                    }
                    size={16}
                    color={
                      eventTypeFilterConfig.filters.hiddenOnly ? colors.text : colors.textSecondary
                    }
                  />
                  <Text
                    className={
                      eventTypeFilterConfig.filters.hiddenOnly
                        ? "text-base font-semibold text-[#000000] dark:text-white"
                        : "text-base dark:text-gray-300"
                    }
                  >
                    Hidden Only
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuItem onPress={() => eventTypeFilterConfig.onToggleFilter("paidOnly")}>
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={
                      eventTypeFilterConfig.filters.paidOnly ? "checkmark-circle" : "cash-outline"
                    }
                    size={16}
                    color={
                      eventTypeFilterConfig.filters.paidOnly ? colors.text : colors.textSecondary
                    }
                  />
                  <Text
                    className={
                      eventTypeFilterConfig.filters.paidOnly
                        ? "text-base font-semibold text-[#000000] dark:text-white"
                        : "text-base dark:text-gray-300"
                    }
                  >
                    Paid Events
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuItem onPress={() => eventTypeFilterConfig.onToggleFilter("seatedOnly")}>
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={
                      eventTypeFilterConfig.filters.seatedOnly
                        ? "checkmark-circle"
                        : "people-outline"
                    }
                    size={16}
                    color={
                      eventTypeFilterConfig.filters.seatedOnly ? colors.text : colors.textSecondary
                    }
                  />
                  <Text
                    className={
                      eventTypeFilterConfig.filters.seatedOnly
                        ? "text-base font-semibold text-[#000000] dark:text-white"
                        : "text-base dark:text-gray-300"
                    }
                  >
                    Seated Events
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuItem
                onPress={() => eventTypeFilterConfig.onToggleFilter("requiresConfirmationOnly")}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={
                      eventTypeFilterConfig.filters.requiresConfirmationOnly
                        ? "checkmark-circle"
                        : "checkmark-circle-outline"
                    }
                    size={16}
                    color={
                      eventTypeFilterConfig.filters.requiresConfirmationOnly
                        ? colors.text
                        : colors.textSecondary
                    }
                  />
                  <Text
                    className={
                      eventTypeFilterConfig.filters.requiresConfirmationOnly
                        ? "text-base font-semibold text-[#000000] dark:text-white"
                        : "text-base dark:text-gray-300"
                    }
                  >
                    Requires Confirmation
                  </Text>
                </View>
              </DropdownMenuItem>

              <DropdownMenuItem
                onPress={() => eventTypeFilterConfig.onToggleFilter("recurringOnly")}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={
                      eventTypeFilterConfig.filters.recurringOnly
                        ? "checkmark-circle"
                        : "repeat-outline"
                    }
                    size={16}
                    color={
                      eventTypeFilterConfig.filters.recurringOnly
                        ? colors.text
                        : colors.textSecondary
                    }
                  />
                  <Text
                    className={
                      eventTypeFilterConfig.filters.recurringOnly
                        ? "text-base font-semibold text-[#000000] dark:text-white"
                        : "text-base dark:text-gray-300"
                    }
                  >
                    Recurring
                  </Text>
                </View>
              </DropdownMenuItem>

              {/* Clear All - only show when filters are active */}
              {eventTypeFilterConfig.activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onPress={eventTypeFilterConfig.onResetFilters}>
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="close-circle-outline" size={16} color="#FF3B30" />
                      <Text className="text-base text-[#FF3B30]">Clear All Filters</Text>
                    </View>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Profile Picture */}
        <TouchableOpacity onPress={handleProfile} className="p-1">
          {loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : userProfile?.avatarUrl ? (
            <Image
              source={{ uri: getAvatarUrl(userProfile.avatarUrl) }}
              className="h-8 w-8 rounded-full"
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
          ) : (
            <View
              className="items-center justify-center rounded-full bg-[#E5E5EA] dark:bg-[#4D4D4D]"
              style={{ width: 32, height: 32 }}
            >
              <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
