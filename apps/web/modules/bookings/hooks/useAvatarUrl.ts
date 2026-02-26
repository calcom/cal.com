import { trpc } from "@calcom/trpc/react";

export function useAvatarUrl(email: string | undefined, enabled: boolean) {
  const { data } = trpc.viewer.bookings.getAvatarUrl.useQuery(
    { email: email ?? "" },
    {
      enabled: enabled && !!email,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      retry: false,
    }
  );

  return data?.url ?? null;
}
