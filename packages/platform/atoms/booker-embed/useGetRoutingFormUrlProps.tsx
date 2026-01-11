import { useMemo } from "react";

import type { RoutingFormSearchParamsForEmbed } from "@calcom/platform-types";

import type { BookerPlatformWrapperAtomPropsForTeam } from "../booker/BookerPlatformWrapper";

export type useGetRoutingFormUrlPropsReturnType = RoutingFormSearchParamsForEmbed;

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
      const defaultFormValues = {
        ...(routingSearchParams.get("firstName") && {
          ["firstName"]: routingSearchParams.get("firstName") ?? undefined,
        }),
        ...(routingSearchParams.get("lastName") && {
          ["lastName"]: routingSearchParams.get("lastName") ?? undefined,
        }),
        ...(routingSearchParams.get("name") && {
          ["name"]: routingSearchParams.get("name") ?? undefined,
        }),
        ...(routingSearchParams.get("email") && {
          ["email"]: routingSearchParams.get("email") ?? undefined,
        }),
        ...(routingSearchParams.get("notes") && {
          ["notes"]: routingSearchParams.get("notes") ?? undefined,
        }),
        ...(routingSearchParams.get("rescheduleReason") && {
          ["rescheduleReason"]: routingSearchParams.get("rescheduleReason") ?? undefined,
        }),
        ...(routingSearchParams.get("guests") && {
          ["guests"]: routingSearchParams.getAll("guests") ?? undefined,
        }),
      } satisfies Partial<BookerPlatformWrapperAtomPropsForTeam["defaultFormValues"]>;

      const routingformProps = {
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
        ...(routingSearchParams.get("cal.routingFormResponseId") && {
          ["cal.routingFormResponseId"]: routingSearchParams.get("cal.routingFormResponseId") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.salesforce.rrSkipToAccountLookupField") && {
          ["cal.salesforce.rrSkipToAccountLookupField"]:
            routingSearchParams.get("cal.salesforce.rrSkipToAccountLookupField") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.teamMemberEmail") && {
          teamMemberEmail: routingSearchParams.get("cal.teamMemberEmail") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.crmOwnerRecordType") && {
          crmOwnerRecordType: routingSearchParams.get("cal.crmOwnerRecordType") ?? undefined,
        }),
        ...(routingSearchParams.get("cal.crmAppSlug") && {
          crmAppSlug: routingSearchParams.get("cal.crmAppSlug") ?? undefined,
        }),
      } satisfies RoutingFormSearchParamsForEmbed;
      return { ...routingformProps, defaultFormValues };
    }
    return;
  }, [routingFormUrl]);

  return routingFormUrlProps;
};
