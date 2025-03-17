import { getTeamsFiltersFromQuery } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc";

const useTeamsAndUserProfiles = ({ membershipRole }: { membershipRole?: boolean } = {}) => {
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);
  const { data: getUserEventGroupsData } = trpc.viewer.eventTypes.getUserEventGroups.useQuery(
    filters && { filters },
    {
      refetchOnWindowFocus: false,
      gcTime: 1 * 60 * 60 * 1000,
      staleTime: 1 * 60 * 60 * 1000,
    }
  );
  const profileOptions =
    getUserEventGroupsData?.profiles
      ?.filter((profile) => !profile.readOnly)
      ?.filter((profile) => !profile.eventTypesLockedByOrg)
      ?.map((profile) => ({
        teamId: profile.teamId,
        label: profile.name || profile.slug,
        image: profile.image,
        slug: profile.slug,
        membershipRole: membershipRole ? profile.membershipRole : undefined,
      })) ?? [];
  return profileOptions;
};

export { useTeamsAndUserProfiles };
