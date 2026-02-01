import { ScrollView, View, useColorScheme } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { getColors } from "@/constants/colors";

interface BookingListItemSkeletonProps {
  isLast?: boolean;
}

export function BookingListItemSkeleton({ isLast = false }: BookingListItemSkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderBottomWidth: !isLast ? 1 : 0,
        borderBottomColor: theme.border,
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}
        >
          <Skeleton style={{ height: 14, width: 100, borderRadius: 4 }} />
          <Skeleton style={{ height: 14, width: 120, borderRadius: 4, marginLeft: 8 }} />
        </View>

        <View style={{ marginBottom: 12 }}>
          <Skeleton style={{ height: 20, width: "90%", borderRadius: 4, marginBottom: 4 }} />
          <Skeleton style={{ height: 20, width: "70%", borderRadius: 4 }} />
        </View>

        <View style={{ marginBottom: 8 }}>
          <Skeleton style={{ height: 14, width: "60%", borderRadius: 4 }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Skeleton style={{ height: 16, width: 16, borderRadius: 4 }} />
          <Skeleton style={{ height: 14, width: 90, borderRadius: 4, marginLeft: 6 }} />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 8,
        }}
      >
        <Skeleton style={{ height: 32, width: 32, borderRadius: 8 }} />
      </View>
    </View>
  );
}

interface BookingListSkeletonProps {
  count?: number;
  iosStyle?: boolean;
}

export function BookingListSkeleton({ count = 4, iosStyle = false }: BookingListSkeletonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getColors(isDark);

  if (iosStyle) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: theme.backgroundMuted,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            paddingHorizontal: 8,
            paddingVertical: 12,
          }}
        >
          <Skeleton style={{ height: 16, width: 80, borderRadius: 4 }} />
        </View>
        {Array.from({ length: count }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't reorder
          <BookingListItemSkeleton key={`booking-skeleton-${index}`} isLast={index === count - 1} />
        ))}
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 px-2 pt-4 md:px-4">
      <View
        className="flex-1 overflow-hidden rounded-lg border"
        style={{ borderColor: theme.border, backgroundColor: theme.background }}
      >
        <View
          style={{
            backgroundColor: theme.backgroundMuted,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            paddingHorizontal: 8,
            paddingVertical: 12,
          }}
        >
          <Skeleton style={{ height: 16, width: 80, borderRadius: 4 }} />
        </View>
        {Array.from({ length: count }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't reorder
          <BookingListItemSkeleton key={`booking-skeleton-${index}`} isLast={index === count - 1} />
        ))}
      </View>
    </View>
  );
}
