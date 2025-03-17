import { useState, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

export const HashedLinkUsageIndicator = ({ link }: { link: string }) => {
  // Component still fetches data for potential future use but doesn't render any UI
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<{
    expiresAt: Date | null;
    maxUsageCount: number | null;
    usageCount: number;
  } | null>(null);

  const { data, isLoading: isFetching } = trpc.viewer.eventTypes.getHashedLink.useQuery(
    { linkId: link },
    {
      enabled: !!link,
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  useEffect(() => {
    if (data) {
      setUsageData({
        expiresAt: data.expiresAt,
        maxUsageCount: data.maxUsageCount,
        usageCount: data.usageCount,
      });
      setIsLoading(false);
    } else if (!isFetching) {
      setIsLoading(false);
    }
  }, [data, isFetching]);

  // Don't render any UI
  return null;
};
