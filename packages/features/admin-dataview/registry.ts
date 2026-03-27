import type { TableRegistry } from "./types";
import { AdminTableRegistry } from "./AdminTableRegistry";

import { userTable } from "./tables/user";
import { eventTypeTable } from "./tables/event-type";
import { teamTable } from "./tables/team";
import { membershipTable } from "./tables/membership";
import { bookingTable } from "./tables/booking";
import { attendeeTable } from "./tables/attendee";
import { profileTable } from "./tables/profile";
import { scheduleTable } from "./tables/schedule";
import { workflowTable } from "./tables/workflow";
import { teamBillingTable } from "./tables/team-billing";
import { orgBillingTable } from "./tables/org-billing";
import { teamDunningTable } from "./tables/team-dunning";
import { orgDunningTable } from "./tables/org-dunning";
import { paymentTable } from "./tables/payment";
import { creditBalanceTable } from "./tables/credit-balance";
import { appTable } from "./tables/app";
import { webhookTable } from "./tables/webhook";
import { userAbuseScoreTable } from "./tables/user-abuse-score";
import { watchlistTable } from "./tables/watchlist";
import { bookingReportTable } from "./tables/booking-report";
import { featureTable } from "./tables/feature";
import { orgSettingsTable } from "./tables/org-settings";
import { impersonationsTable } from "./tables/impersonations";

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
] as const;

export const registry = new AdminTableRegistry(ALL_TABLES);

export { AdminTable } from "./AdminTable";
export { AdminTableRegistry } from "./AdminTableRegistry";
