import { useMemo } from "react";

import type { RoutingFormSearchParamsForEmbed } from "@calcom/platform-types";

export const useGetRoutingFormUrlProps = ({ routingFormUrl }: { routingFormUrl?: string }) => {
  const routingFormUrlProps = useMemo(() => {
    if (routingFormUrl) {
      const routingUrl = new URL(routingFormUrl);
      const pathNameParams = routingUrl.pathname.split("/");

      if (pathNameParams.length < 2) {
        throw new Error("Invalid routing form url.");
      }

      const eventTypeSlug = pathNameParams[pathNameParams.length - 1];
      const isTeamUrl = pathNameParams[1] === "team";
      const username = isTeamUrl ? undefined : pathNameParams[1];
      const routingSearchParams = routingUrl.searchParams;
      if (!eventTypeSlug) {
        throw new Error("Event type slug is not defined within the routing form url");
      }
      if (!isTeamUrl && !username) {
        throw new Error("username not defined within the routing form url");
      }
      return {
        organizationId: routingSearchParams.get("cal.orgId")
          ? Number(routingSearchParams.get("cal.orgId"))
          : undefined,
        teamId: routingSearchParams.get("cal.teamId")
          ? Number(routingSearchParams.get("cal.teamId"))
          : undefined,
        username,
        eventTypeSlug,
        ...(routingSearchParams.get("cal.routedTeamMemberIds") && {
          ["cal.routedTeamMemberIds"]: routingSearchParams.get("cal.routedTeamMemberIds") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.reroutingFormResponses") && {
          ["cal.reroutingFormResponses"]: routingSearchParams.get("cal.reroutingFormResponses") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.skipContactOwner") && {
          ["cal.skipContactOwner"]: routingSearchParams.get("cal.skipContactOwner") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.isBookingDryRun") && {
          ["cal.isBookingDryRun"]: routingSearchParams.get("cal.isBookingDryRun") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.cache") && {
          ["cal.cache"]: routingSearchParams.get("cal.cache") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.routingFormResponseId") && {
          ["cal.routingFormResponseId"]: routingSearchParams.get("cal.routingFormResponseId") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.salesforce.rrSkipToAccountLookupField") && {
          ["cal.salesforce.rrSkipToAccountLookupField"]:
            routingSearchParams.get("cal.salesforce.rrSkipToAccountLookupField") ?? undefined,
        }),
      } satisfies RoutingFormSearchParamsForEmbed;
    }
    return;
  }, [routingFormUrl]);

  return routingFormUrlProps;
};
