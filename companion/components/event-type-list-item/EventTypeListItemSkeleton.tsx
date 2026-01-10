import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";

interface EventTypeListItemSkeletonProps {
  isLast?: boolean;
}

export function EventTypeListItemSkeleton({ isLast = false }: EventTypeListItemSkeletonProps) {
  return (
    <View className={`bg-cal-bg ${!isLast ? "border-b border-cal-border" : ""}`}>
      <View
        style={{ paddingHorizontal: 16, paddingVertical: 16 }}
        className="flex-row items-center justify-between"
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View className="mb-1 flex-row flex-wrap items-baseline">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="ml-2 h-4 w-24 rounded" />
          </View>

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </View>
        </View>

        <Skeleton className="h-9 w-9 rounded-lg" />
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
