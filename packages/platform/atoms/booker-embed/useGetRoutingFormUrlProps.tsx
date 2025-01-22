import { useMemo } from "react";

import type { RoutingFormSearchParamsForEmbed } from "@calcom/platform-types";

export const useGetRoutingFormUrlProps = ({ routingFormUrl }: { routingFormUrl?: string }) => {
  const routingFormUrlProps = useMemo(() => {
    if (routingFormUrl) {
      const routingUrl = new URL(routingFormUrl);
      const routingSearchParams = routingUrl.searchParams;
      return {
        organizationId: routingSearchParams.get("cal.orgId")
          ? Number(routingSearchParams.get("cal.orgId"))
          : undefined,
        teamId: routingSearchParams.get("cal.teamId")
          ? Number(routingSearchParams.get("cal.orgId"))
          : undefined,
        routedTeamMemberIds: routingSearchParams.get("cal.routedTeamMemberIds") ?? undefined,
        reroutingFormResponses: routingSearchParams.get("cal.reroutingFormResponses") ?? undefined,
        skipContactOwner: routingSearchParams.get("cal.skipContactOwner") ?? undefined,
        isBookingDryRun: routingSearchParams.get("cal.isBookingDryRun") ?? undefined,
        cache: routingSearchParams.get("cal.cache") ?? undefined,
        routingFormResponseId: routingSearchParams.get("cal.routingFormResponseId") ?? undefined,
      } satisfies RoutingFormSearchParamsForEmbed;
    }
    return;
  }, [routingFormUrl]);

  return routingFormUrlProps;
};
