import { trpc } from "@calcom/trpc/react";

export function useFlags() {
  const query = trpc.viewer.features.map.useQuery(undefined, {
    initialData: process.env.NEXT_PUBLIC_IS_E2E ? { "managed-event-types": true, teams: true } : {},
  });
  return query.data;
}
