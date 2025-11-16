export type RoutingFormSearchParamsForEmbed = {
  organizationId?: number;
  teamId?: number;
  eventTypeSlug: string;
  username?: string;
  crmAppSlug?: string;
  crmOwnerRecordType?: string;
  teamMemberEmail?: string;
} & RoutingFormSearchParams;

export type RoutingFormSearchParams = {
  ["cal.routedTeamMemberIds"]?: string;
  ["cal.reroutingFormResponses"]?: string;
  ["cal.skipContactOwner"]?: string;
  ["cal.isBookingDryRun"]?: string;
  ["cal.routingFormResponseId"]?: string;
  ["cal.crmAppSlug"]?: string;
  ["cal.crmOwnerRecordType"]?: string;
  ["cal.teamMemberEmail"]?: string;
  ["cal.salesforce.rrSkipToAccountLookupField"]?: string;
};
