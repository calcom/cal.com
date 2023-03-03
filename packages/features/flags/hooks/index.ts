import { trpc } from "@calcom/trpc/react";

// TODO: Make the slugs type safe
export function useFlagSuspense(slug: string) {
  const [data] = trpc.viewer.features.isEnabled.useSuspenseQuery(slug, { initialData: false });
  return data;
}

export function useFlag(slug: string) {
  const query = trpc.viewer.features.isEnabled.useQuery(slug, { initialData: false });
  return query.data;
}

export function useFlags() {
  const query = trpc.viewer.features.map.useQuery(undefined, { initialData: {} });
  return query.data;
}
