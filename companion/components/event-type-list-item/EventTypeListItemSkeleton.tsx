import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

interface EventTypeListItemSkeletonProps {
  isLast?: boolean;
}

export function EventTypeListItemSkeleton({ isLast = false }: EventTypeListItemSkeletonProps) {
  return (
    <View className={`bg-cal-bg ${!isLast ? "border-b border-cal-border" : ""}`}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          {/* Title + Link row - matches EventTypeTitle */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "baseline",
              marginBottom: 4,
            }}
          >
            <Skeleton style={{ height: 18, width: 130, borderRadius: 4 }} />
            <Skeleton style={{ height: 14, width: 120, borderRadius: 4, marginLeft: 4 }} />
          </View>

          {/* Badges row - matches EventTypeBadges */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 8,
              gap: 8,
            }}
          >
            {/* Duration badge skeleton */}
            <View
              style={{
                height: 24,
                paddingHorizontal: 8,
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#E5E5EA",
                backgroundColor: "#F5F5F5",
              }}
            >
              <Skeleton style={{ height: 14, width: 14, borderRadius: 3 }} />
              <Skeleton style={{ height: 12, width: 28, borderRadius: 3, marginLeft: 6 }} />
            </View>

            {/* Hidden badge skeleton */}
            <View
              style={{
                height: 24,
                paddingHorizontal: 8,
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#E5E5EA",
                backgroundColor: "#F5F5F5",
              }}
            >
              <Skeleton style={{ height: 14, width: 14, borderRadius: 3 }} />
              <Skeleton style={{ height: 12, width: 40, borderRadius: 3, marginLeft: 6 }} />
            </View>

            {/* Recurrence badge skeleton */}
            <View
              style={{
                height: 24,
                paddingHorizontal: 8,
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#E5E5EA",
                backgroundColor: "#F5F5F5",
              }}
            >
              <Skeleton style={{ height: 14, width: 14, borderRadius: 3 }} />
              <Skeleton style={{ height: 12, width: 44, borderRadius: 3, marginLeft: 6 }} />
            </View>
          </View>
        </View>

        {/* Menu button - matches the three-dot menu */}
        <Skeleton style={{ height: 36, width: 36, borderRadius: 8 }} />
      </View>
    </View>
  );
}

interface EventTypeListSkeletonProps {
  count?: number;
}

export function EventTypeListSkeleton({ count = 5 }: EventTypeListSkeletonProps) {
  return (
    <View className="px-2 pt-4 md:px-4">
      <View className="overflow-hidden rounded-lg border border-[#E5E5EA] bg-white">
        {Array.from({ length: count }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't reorder
          <EventTypeListItemSkeleton key={`skeleton-${index}`} isLast={index === count - 1} />
        ))}
      </View>
    </View>
  );
}
