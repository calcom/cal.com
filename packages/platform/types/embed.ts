export type RoutingFormSearchParamsForEmbed = {
  organizationId?: number;
  teamId?: number;
} & RoutingFormSearchParams;

export type RoutingFormSearchParams = {
  routedTeamMemberIds?: string;
  reroutingFormResponses?: string;
  skipContactOwner?: string;
  isBookingDryRun?: string;
  cache?: string;
  routingFormResponseId?: string;
};
