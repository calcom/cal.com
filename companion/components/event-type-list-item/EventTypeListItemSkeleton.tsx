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
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }}>
            <Skeleton style={{ height: 20, width: 120, borderRadius: 4 }} />
            <Skeleton style={{ height: 16, width: 100, borderRadius: 4, marginLeft: 8 }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
            <Skeleton style={{ height: 24, width: 56, borderRadius: 6 }} />
            <Skeleton style={{ height: 24, width: 64, borderRadius: 6 }} />
            <Skeleton style={{ height: 24, width: 80, borderRadius: 6 }} />
          </View>
        </View>

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
          <EventTypeListItemSkeleton key={`skeleton-${index}`} isLast={index === count - 1} />
        ))}
      </View>
    </View>
  );
}
