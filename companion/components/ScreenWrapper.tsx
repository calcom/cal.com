import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { EmptyScreen } from "./EmptyScreen";
import { Header } from "./Header";
import { LoadingSpinner } from "./LoadingSpinner";
import { getColors } from "@/constants/colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface EmptyStateConfig {
  icon: IoniconName;
  headline: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

interface ScreenWrapperProps {
  /** Whether data is currently loading */
  loading?: boolean;
  /** Error message to display, if any */
  error?: string | null;
  /** Callback for retry button in error state */
  onRetry?: () => void;
  /** Custom title for error state (default: "Unable to load data") */
  errorTitle?: string;
  /** Whether to show empty state */
  isEmpty?: boolean;
  /** Configuration for empty state display */
  emptyProps?: EmptyStateConfig;
  /** Whether to show the header (default: true) */
  showHeader?: boolean;
  /** Content to render when not in loading/error/empty state */
  children: ReactNode;
}

/**
 * Wrapper component that handles common screen states: loading, error, and empty.
 * Renders the appropriate UI based on the current state.
 *
 * @example
 * ```tsx
 * <ScreenWrapper
 *   loading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 *   errorTitle="Unable to load event types"
 *   isEmpty={eventTypes.length === 0}
 *   emptyProps={{
 *     icon: "calendar-outline",
 *     headline: "No event types",
 *     description: "Create your first event type to get started.",
 *     buttonText: "New",
 *     onButtonPress: handleCreate,
 *   }}
 * >
 *   <EventTypesList data={eventTypes} />
 * </ScreenWrapper>
 * ```
 */
export function ScreenWrapper({
  loading,
  error,
  onRetry,
  errorTitle = "Unable to load data",
  isEmpty,
  emptyProps,
  showHeader = true,
  children,
}: ScreenWrapperProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);
  const errorIconColor = theme.destructive;

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100 dark:bg-black">
        {showHeader && <Header />}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5 dark:bg-[#171717]">
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100 dark:bg-black">
        {showHeader && <Header />}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5 dark:bg-[#171717]">
          <Ionicons name="alert-circle" size={64} color={errorIconColor} />
          <Text className="mb-2 mt-4 text-center text-xl font-bold text-gray-800 dark:text-gray-100">
            {errorTitle}
          </Text>
          <Text className="mb-6 text-center text-base text-gray-500 dark:text-gray-400">
            {error}
          </Text>
          {onRetry && (
            <TouchableOpacity
              className="rounded-lg bg-black px-6 py-3 dark:bg-white"
              onPress={onRetry}
            >
              <Text className="text-base font-semibold text-white dark:text-black">Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (isEmpty && emptyProps) {
    return (
      <View className="flex-1 bg-gray-100 dark:bg-black">
        {showHeader && <Header />}
        <View className="flex-1 items-center justify-center bg-gray-50 p-5 dark:bg-[#171717]">
          <EmptyScreen {...emptyProps} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-black">
      {showHeader && <Header />}
      {children}
    </View>
  );
}

export type { EmptyStateConfig, ScreenWrapperProps };
