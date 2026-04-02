import { AdminTableRegistry } from "./AdminTableRegistry";
import { appTable } from "./tables/app";
import { attendeeTable } from "./tables/attendee";
import { bookingTable } from "./tables/booking";
import { bookingReportTable } from "./tables/booking-report";
import { creditBalanceTable } from "./tables/credit-balance";
import { eventTypeTable } from "./tables/event-type";
import { featureTable } from "./tables/feature";
import { impersonationsTable } from "./tables/impersonations";
import { membershipTable } from "./tables/membership";
import { oauthClientTable } from "./tables/oauth-client";
import { orgBillingTable } from "./tables/org-billing";
import { orgDunningTable } from "./tables/org-dunning";
import { orgSettingsTable } from "./tables/org-settings";
import { paymentTable } from "./tables/payment";
import { profileTable } from "./tables/profile";
import { scheduleTable } from "./tables/schedule";
import { teamTable } from "./tables/team";
import { teamBillingTable } from "./tables/team-billing";
import { teamDunningTable } from "./tables/team-dunning";
import { teamFeaturesTable } from "./tables/team-features";
import { userTable } from "./tables/user";
import { userAbuseScoreTable } from "./tables/user-abuse-score";
import { userFeaturesTable } from "./tables/user-features";
import { watchlistTable } from "./tables/watchlist";
import { webhookTable } from "./tables/webhook";
import { workflowTable } from "./tables/workflow";
import type { TableRegistry } from "./types";

const ALL_TABLES: TableRegistry = [
  userTable,
  eventTypeTable,
  teamTable,
  membershipTable,
  bookingTable,
  attendeeTable,
  profileTable,
  scheduleTable,
  workflowTable,
  teamBillingTable,
  orgBillingTable,
  teamDunningTable,
  orgDunningTable,
  paymentTable,
  creditBalanceTable,
  appTable,
  webhookTable,
  userAbuseScoreTable,
  watchlistTable,
  bookingReportTable,
  featureTable,
  orgSettingsTable,
  impersonationsTable,
  userFeaturesTable,
  teamFeaturesTable,
  oauthClientTable,
] as const;

export const registry = new AdminTableRegistry(ALL_TABLES);

export { AdminTable } from "./AdminTable";
export { AdminTableRegistry } from "./AdminTableRegistry";
