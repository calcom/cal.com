import { useQuery } from "@tanstack/react-query";

import { getCachedAvatarUrl } from "./getCachedAvatarUrl";

export function useAvatarUrl(email: string | undefined, enabled: boolean) {
  const { data } = useQuery({
    queryKey: ["getAvatarUrl", email],
    queryFn: () => getCachedAvatarUrl(email as string),
    enabled: enabled && !!email,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: false,
  });

  return data ?? null;
}
