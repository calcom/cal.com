/**
 * CacheStatusIndicator Component
 *
 * A subtle, non-intrusive component that displays cache status information:
 * - "Last updated: X minutes ago" when online
 * - "Offline - showing cached data" when offline
 *
 * This component is designed to be placed in screen headers or footers
 * to provide users with transparency about data freshness.
 */

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useQueryContext } from "@/contexts/QueryContext";

/**
 * Props for the CacheStatusIndicator component
 */
interface CacheStatusIndicatorProps {
  /** Timestamp when the data was last fetched (from query.dataUpdatedAt) */
  dataUpdatedAt?: number;
  /** Whether data is currently being fetched */
  isFetching?: boolean;
  /** Optional custom style */
  style?: object;
  /** Show compact version (icon only when online) */
  compact?: boolean;
}

/**
 * Format the time difference in a human-readable way
 */
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return "Just now";
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return "Over a day ago";
};

/**
 * CacheStatusIndicator component
 *
 * @example
 * ```tsx
 * const { dataUpdatedAt, isFetching } = useBookings();
 *
 * <CacheStatusIndicator
 *   dataUpdatedAt={dataUpdatedAt}
 *   isFetching={isFetching}
 * />
 * ```
 */
export function CacheStatusIndicator({
  dataUpdatedAt,
  isFetching = false,
  style,
  compact = false,
}: CacheStatusIndicatorProps) {
  const { isOnline } = useQueryContext();

  // Don't show anything if no data has been fetched yet
  if (!dataUpdatedAt && !isFetching && isOnline) {
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <View style={[styles.container, styles.offlineContainer, style]}>
        <Ionicons name="cloud-offline-outline" size={12} color="#FF9500" />
        <Text style={styles.offlineText}>Offline - showing cached data</Text>
      </View>
    );
  }

  // Fetching state
  if (isFetching) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="sync-outline" size={12} color="#A3A3A3" />
        {!compact && <Text style={styles.text}>Updating...</Text>}
      </View>
    );
  }

  // Normal state with last updated time
  if (dataUpdatedAt) {
    if (compact) {
      return (
        <View style={[styles.container, style]}>
          <Ionicons name="time-outline" size={12} color="#A3A3A3" />
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <Ionicons name="time-outline" size={12} color="#A3A3A3" />
        <Text style={styles.text}>Updated {formatTimeAgo(dataUpdatedAt)}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  offlineContainer: {
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    color: "#A3A3A3",
  },
  offlineText: {
    fontSize: 11,
    color: "#FF9500",
    fontWeight: "500",
  },
});

export default CacheStatusIndicator;
