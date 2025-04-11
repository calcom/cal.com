import { useEffect, useState } from "react";

import type { PrivateLinkWithOptions } from "@calcom/features/eventtypes/lib/types";
import { trpc } from "@calcom/trpc/react";

export const useHashedLinkData = (link: string) => {
  const [hashedLinkData, setHashedLinkData] = useState<PrivateLinkWithOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    data,
    isLoading: isFetching,
    error: fetchError,
  } = trpc.viewer.eventTypes.getHashedLink.useQuery(
    { linkId: link },
    {
      enabled: !!link,
      retry: 1,
      onError: (err) => {
        console.error("Error fetching hashed link data:", err);
        setError(err);
        setIsLoading(false);
      },
      // Refetch the data every minute to keep it fresh
      refetchInterval: 60000,
    }
  );

  useEffect(() => {
    if (data) {
      setHashedLinkData({
        link: data.link,
        expiresAt: data.expiresAt,
        maxUsageCount: data.maxUsageCount,
        usageCount: data.usageCount,
      });
      setIsLoading(false);
    } else if (!isFetching && !fetchError) {
      setIsLoading(false);
    }
  }, [data, isFetching, fetchError]);

  return { hashedLinkData, isLoading, error };
};
