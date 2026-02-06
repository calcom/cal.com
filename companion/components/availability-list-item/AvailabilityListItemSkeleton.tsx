import { ScrollView, useColorScheme, View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { getColors } from "@/constants/colors";

interface AvailabilityListItemSkeletonProps {
  isLast?: boolean;
}

export function AvailabilityListItemSkeleton({
  isLast = false,
}: AvailabilityListItemSkeletonProps) {
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
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Skeleton style={{ height: 18, width: 100, borderRadius: 4 }} />
          <Skeleton style={{ height: 20, width: 55, borderRadius: 4, marginLeft: 8 }} />
        </View>

        <View style={{ marginBottom: 4 }}>
          <Skeleton style={{ height: 14, width: "85%", borderRadius: 4, marginBottom: 4 }} />
          <Skeleton style={{ height: 14, width: "80%", borderRadius: 4, marginBottom: 4 }} />
          <Skeleton style={{ height: 14, width: 80, borderRadius: 4 }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <Skeleton style={{ height: 14, width: 14, borderRadius: 7 }} />
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
        }}
      >
        <Skeleton style={{ height: 32, width: 32, borderRadius: 8 }} />
      </View>
    </View>
  );
}

interface AvailabilityListSkeletonProps {
  count?: number;
  iosStyle?: boolean;
}

export function AvailabilityListSkeleton({
  count = 4,
  iosStyle = false,
}: AvailabilityListSkeletonProps) {
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
            flex: 1,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            marginHorizontal: 8,
            marginVertical: 4,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: count }).map((_, index) => (
            <AvailabilityListItemSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't reorder
              key={`availability-skeleton-${index}`}
              isLast={index === count - 1}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <AvailabilityListItemSkeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton items don't reorder
          key={`availability-skeleton-${index}`}
          isLast={index === count - 1}
        />
      ))}
    </View>
  );
}
