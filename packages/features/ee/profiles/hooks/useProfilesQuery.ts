import { trpc } from "@calcom/trpc/react";

export function useProfilesQuery() {
  const profilesQuery = trpc.viewer.profiles.listCurrent.useQuery();
  return profilesQuery;
}

export default useProfilesQuery;
