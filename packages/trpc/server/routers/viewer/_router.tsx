import { userAdminRouter } from "@calcom/features/ee/users/server/trpc-router";
import { featureFlagRouter } from "@calcom/features/flags/server/router";
import { insightsRouter } from "@calcom/features/insights/server/trpc-router";

import { router } from "../../trpc";
import app_Basecamp3 from "../apps/basecamp3/_router";
import app_RoutingForms from "../apps/routing-forms/_router";
import { loggedInViewerRouter } from "../loggedInViewer/_router";
import { publicViewerRouter } from "../publicViewer/_router";
import { timezonesRouter } from "../publicViewer/timezones/_router";
import { adminMutationsRouter } from "./admin/mutations/_router";
import { adminQueriesRouter } from "./admin/queries/_router";
import { aiVoiceAgentMutationsRouter } from "./aiVoiceAgent/mutations/_router";
import { aiVoiceAgentQueriesRouter } from "./aiVoiceAgent/queries/_router";
import { apiKeysMutationsRouter } from "./apiKeys/mutations/_router";
import { apiKeysQueriesRouter } from "./apiKeys/queries/_router";
import { appsMutationsRouter } from "./apps/mutations/_router";
import { appsQueriesRouter } from "./apps/queries/_router";
import { attributesMutationsRouter } from "./attributes/mutations/_router";
import { attributesQueriesRouter } from "./attributes/queries/_router";
import { authMutationsRouter } from "./auth/mutations/_router";
import { availabilityQueriesRouter } from "./availability/queries/_router";
import { bookingsMutationsRouter } from "./bookings/mutations/_router";
import { bookingsQueriesRouter } from "./bookings/queries/_router";
import { calVideoQueriesRouter } from "./calVideo/queries/_router";
import { calendarsMutationsRouter } from "./calendars/mutations/_router";
import { calendarsQueriesRouter } from "./calendars/queries/_router";
import { credentialsMutationsRouter } from "./credentials/mutations/_router";
import { creditsMutationsRouter } from "./credits/mutations/_router";
import { creditsQueriesRouter } from "./credits/queries/_router";
import { delegationCredentialMutationsRouter } from "./delegationCredential/mutations/_router";
import { delegationCredentialQueriesRouter } from "./delegationCredential/queries/_router";
import { deploymentSetupMutationsRouter } from "./deploymentSetup/mutations/_router";
import { deploymentSetupQueriesRouter } from "./deploymentSetup/queries/_router";
import { dsyncMutationsRouter } from "./dsync/mutations/_router";
import { dsyncQueriesRouter } from "./dsync/queries/_router";
import { eventTypesMutationsRouter } from "./eventTypes/mutations/_router";
import { eventTypesQueriesRouter } from "./eventTypes/queries/_router";
import { filterSegmentsMutationsRouter } from "./filterSegments/mutations/_router";
import { filterSegmentsQueriesRouter } from "./filterSegments/queries/_router";
import { googleWorkspaceMutationsRouter } from "./googleWorkspace/mutations/_router";
import { googleWorkspaceQueriesRouter } from "./googleWorkspace/queries/_router";
import { i18nQueriesRouter } from "./i18n/queries/_router";
import { meMutationsRouter } from "./me/mutations/_router";
import { meQueriesRouter } from "./me/queries/_router";
import { oAuthMutationsRouter } from "./oAuth/mutations/_router";
import { oAuthQueriesRouter } from "./oAuth/queries/_router";
import { oooMutationsRouter } from "./ooo/mutations/_router";
import { oooQueriesRouter } from "./ooo/queries/_router";
import { organizationsMutationsRouter } from "./organizations/mutations/_router";
import { organizationsQueriesRouter } from "./organizations/queries/_router";
import { paymentsMutationsRouter } from "./payments/mutations/_router";
import { phoneNumberMutationsRouter } from "./phoneNumber/mutations/_router";
import { phoneNumberQueriesRouter } from "./phoneNumber/queries/_router";
import { routingFormsMutationsRouter } from "./routing-forms/mutations/_router";
import { slotsMutationsRouter } from "./slots/mutations/_router";
import { slotsQueriesRouter } from "./slots/queries/_router";
import { ssoMutationsRouter } from "./sso/mutations/_router";
import { ssoQueriesRouter } from "./sso/queries/_router";
import { teamsMutationsRouter } from "./teams/mutations/_router";
import { teamsQueriesRouter } from "./teams/queries/_router";
import { travelSchedulesQueriesRouter } from "./travelSchedules/queries/_router";
import { webhookMutationsRouter } from "./webhook/mutations/_router";
import { webhookQueriesRouter } from "./webhook/queries/_router";
import { workflowsMutationsRouter } from "./workflows/mutations/_router";
import { workflowsQueriesRouter } from "./workflows/queries/_router";

export const viewerRouter = router({
  loggedInViewerRouter,
  apps: router({
    queries: appsQueriesRouter,
    mutations: appsMutationsRouter,
  }),
  me: router({
    queries: meQueriesRouter,
    mutations: meMutationsRouter,
  }),
  public: publicViewerRouter,
  auth: router({
    mutations: authMutationsRouter,
  }),
  deploymentSetup: router({
    queries: deploymentSetupQueriesRouter,
    mutations: deploymentSetupMutationsRouter,
  }),
  bookings: router({
    queries: bookingsQueriesRouter,
    mutations: bookingsMutationsRouter,
  }),
  calendars: router({
    queries: calendarsQueriesRouter,
    mutations: calendarsMutationsRouter,
  }),
  calVideo: router({
    queries: calVideoQueriesRouter,
  }),
  credentials: router({
    mutations: credentialsMutationsRouter,
  }),
  eventTypes: router({
    queries: eventTypesQueriesRouter,
    mutations: eventTypesMutationsRouter,
  }),
  availability: router({
    queries: availabilityQueriesRouter,
  }),
  teams: router({
    queries: teamsQueriesRouter,
    mutations: teamsMutationsRouter,
  }),
  timezones: timezonesRouter,
  organizations: router({
    queries: organizationsQueriesRouter,
    mutations: organizationsMutationsRouter,
  }),
  delegationCredential: router({
    queries: delegationCredentialQueriesRouter,
    mutations: delegationCredentialMutationsRouter,
  }),
  webhook: router({
    queries: webhookQueriesRouter,
    mutations: webhookMutationsRouter,
  }),
  apiKeys: router({
    queries: apiKeysQueriesRouter,
    mutations: apiKeysMutationsRouter,
  }),
  slots: router({
    queries: slotsQueriesRouter,
    mutations: slotsMutationsRouter,
  }),
  workflows: router({
    queries: workflowsQueriesRouter,
    mutations: workflowsMutationsRouter,
  }),
  saml: router({
    queries: ssoQueriesRouter,
    mutations: ssoMutationsRouter,
  }),
  dsync: router({
    queries: dsyncQueriesRouter,
    mutations: dsyncMutationsRouter,
  }),
  i18n: router({
    queries: i18nQueriesRouter,
  }),
  insights: insightsRouter,
  payments: router({
    mutations: paymentsMutationsRouter,
  }),
  filterSegments: router({
    queries: filterSegmentsQueriesRouter,
    mutations: filterSegmentsMutationsRouter,
  }),
  // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
  // After that there would just one merge call here for all the apps.
  appRoutingForms: app_RoutingForms,
  appBasecamp3: app_Basecamp3,
  features: featureFlagRouter,
  users: userAdminRouter,
  oAuth: router({
    queries: oAuthQueriesRouter,
    mutations: oAuthMutationsRouter,
  }),
  googleWorkspace: router({
    queries: googleWorkspaceQueriesRouter,
    mutations: googleWorkspaceMutationsRouter,
  }),
  admin: router({
    queries: adminQueriesRouter,
    mutations: adminMutationsRouter,
  }),
  attributes: router({
    queries: attributesQueriesRouter,
    mutations: attributesMutationsRouter,
  }),
  routingForms: router({
    mutations: routingFormsMutationsRouter,
  }),
  credits: router({
    queries: creditsQueriesRouter,
    mutations: creditsMutationsRouter,
  }),
  ooo: router({
    queries: oooQueriesRouter,
    mutations: oooMutationsRouter,
  }),
  travelSchedules: router({
    queries: travelSchedulesQueriesRouter,
  }),
  aiVoiceAgent: router({
    queries: aiVoiceAgentQueriesRouter,
    mutations: aiVoiceAgentMutationsRouter,
  }),
  phoneNumber: router({
    queries: phoneNumberQueriesRouter,
    mutations: phoneNumberMutationsRouter,
  }),
});
