export type RoutingFormSearchParamsForEmbed = {
  organizationId?: number;
  teamId?: number;
  eventTypeSlug: string;
  username?: string;
} & RoutingFormSearchParams;

export type RoutingFormSearchParams = {
  ["cal.routedTeamMemberIds"]?: string;
  ["cal.reroutingFormResponses"]?: string;
  ["cal.skipContactOwner"]?: string;
  ["cal.isBookingDryRun"]?: string;
  ["cal.cache"]?: string;
  ["cal.routingFormResponseId"]?: string;
  ["cal.salesforce.rrSkipToAccountLookupField"]?: string;
};
