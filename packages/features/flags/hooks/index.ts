import { trpc } from "@calcom/trpc/react";

export function useFlags() {
  const query = trpc.viewer.features.map.useQuery(undefined, { initialData: {} });
  return query.data;
}
