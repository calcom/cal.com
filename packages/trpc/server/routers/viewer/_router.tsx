import { userAdminRouter } from "@calcom/features/ee/users/server/trpc-router";
import { featureFlagRouter } from "@calcom/features/flags/server/router";
import { insightsRouter } from "@calcom/features/insights/server/trpc-router";

import { router } from "../../trpc";
import app_Basecamp3 from "../apps/basecamp3/_router";
import app_RoutingForms from "../apps/routing-forms/_router";
import { loggedInViewerRouter } from "../loggedInViewer/_router";
import { publicViewerRouter } from "../publicViewer/_router";
import { timezonesRouter } from "../publicViewer/timezones/_router";
import { adminRouter } from "./admin/mutations/_router";
import { adminRouter } from "./admin/queries/_router";
import { aiVoiceAgentRouter as aiVoiceAgentMutationsRouter } from "./aiVoiceAgent/mutations/_router";
import { aiVoiceAgentRouter as aiVoiceAgentQueriesRouter } from "./aiVoiceAgent/queries/_router";
import { apiKeysRouter as apiKeysMutationsRouter } from "./apiKeys/mutations/_router";
import { apiKeysRouter as apiKeysQueriesRouter } from "./apiKeys/queries/_router";
import { appsRouter as appsMutationsRouter } from "./apps/mutations/_router";
import { appsRouter as appsQueriesRouter } from "./apps/queries/_router";
import { attributesRouter as attributesMutationsRouter } from "./attributes/mutations/_router";
import { attributesRouter as attributesQueriesRouter } from "./attributes/queries/_router";
import { authRouter as authMutationsRouter } from "./auth/mutations/_router";
import { availabilityRouter as availabilityQueriesRouter } from "./availability/queries/_router";
import { bookingsRouter as bookingsMutationsRouter } from "./bookings/mutations/_router";
import { bookingsRouter as bookingsQueriesRouter } from "./bookings/queries/_router";
import { calVideoRouter as calVideoQueriesRouter } from "./calVideo/queries/_router";
import { calendarsRouter as calendarsMutationsRouter} from "./calendars/mutations/_router";
import { calendarsRouter as calendarsQueriesRouter } from "./calendars/queries/_router";
import { credentialsRouter as credentialsMutationsRouter } from "./credentials/mutations/_router";
import { creditsRouter as creditsMutationsRouter } from "./credits/mutations/_router";
import { creditsRouter as creditsQueriesRouter } from "./credits/queries/_router";
import { delegationCredentialRouter as delegationCredentialMutationsRouter } from "./delegationCredential/mutations/_router";
import { delegationCredentialRouter as delegationCredentialQueriesRouter } from "./delegationCredential/queries/_router";
import { deploymentSetupRouter as deploymentSetupMutationsRouter } from "./deploymentSetup/mutations/_router";
import { deploymentSetupRouter as deploymentSetupQueriesRouter} from "./deploymentSetup/queries/_router";
import { dsyncRouter as dsyncMutationsRouter } from "./dsync/mutations/_router";
import { dsyncRouter as dsyncQueriesRouter} from "./dsync/queries/_router";
import { eventTypesRouter as eventTypesMutationsRouter} from "./eventTypes/mutations/_router";
import { eventTypesRouter as eventTypesQueriesRouter } from "./eventTypes/queries/_router";
import { filterSegmentsRouter as filterSegmentsMutationsRouter } from "./filterSegments/mutations/_router";
import { filterSegmentsRouter as filterSegmentsQueriesRouter } from "./filterSegments/queries/_router";
import { googleWorkspaceRouter as googleWorkspaceMutationsRouter } from "./googleWorkspace/mutations/_router";
import { googleWorkspaceRouter as googleWorkspaceQueriesRouter } from "./googleWorkspace/queries/_router";
import { i18nRouter as i18nQueriesRouter } from "./i18n/queries/_router";
import { meRouter as meMutationsRouter } from "./me/mutations/_router";
import { meRouter as meQueriesRouter } from "./me/queries/_router";
import { oAuthRouter as oAuthMutationsRouter } from "./oAuth/mutations/_router";
import { oAuthRouter as oAuthQueriesRouter } from "./oAuth/queries/_router";
import { oooRouter as oooMutationsRouter } from "./ooo/mutations/_router";
import { oooRouter as oooQueriesRouter } from "./ooo/queries/_router";
import { organizationsRouter as organizationsMutationsRouter } from "./organizations/mutations/_router";
import { organizationsRouter as organizationQueriesRouter } from "./organizations/queries/_router";
import { paymentsRouter as paymentsMutationsRouter } from "./payments/mutations/_router";
import { phoneNumberRouter as phoneNumberMutationsRouter } from "./phoneNumber/mutations/_router";
import { phoneNumberRouter as phoneNumberQueriesRouter } from "./phoneNumber/queries/_router";
import { routingFormsRouter as routingFormsMutationsRouter } from "./routing-forms/mutations/_router";
import { slotsRouter as slotsMutationsRouter } from "./slots/mutations/_router";
import { slotsRouter as slotsQueriesRouter } from "./slots/queries/_router";
import { ssoRouter as ssoMutationsRouter } from "./sso/mutations/_router";
import { ssoRouter as ssoQueriesRouter } from "./sso/queries/_router";
import { teamsRouter as teamsMutationsRouter } from "./teams/mutations/_router";
import { teamsRouter as teamsQueriesRouter } from "./teams/queries/_router";
import { travelSchedulesRouter as travelSchedulesQueriesRouter} from "./travelSchedules/queries/_router";
import { webhookRouter as webhookMutationsRouter } from "./webhook/mutations/_router";
import { webhookRouter as webhookQueriesRouter } from "./webhook/queries/_router";
import { workflowsRouter as workflowsMutationsRouter } from "./workflows/mutations/_router";
import { workflowsRouter as workflowsQueriesRouter } from "./workflows/queries/_router";

export const viewerRouter = router({
  loggedInViewerRouter,
  apps: router({
    queries: appsRouter,
    mutations: appsRouter,
  }),
  me: router({
    queries: meRouter,
    mutations: meRouter,
  }),
  public: publicViewerRouter,
  auth: router({
    mutations: authRouter,
  }),
  deploymentSetup: router({
    queries: deploymentSetupRouter,
    mutations: deploymentSetupRouter,
  }),
  bookings: router({
    queries: bookingsRouter,
    mutations: bookingsRouter,
  }),
  calendars: router({
    queries: calendarsRouter,
    mutations: calendarsRouter,
  }),
  calVideo: router({
    queries: calVideoRouter,
  }),
  credentials: router({
    mutations: credentialsRouter,
  }),
  eventTypes: router({
    queries: eventTypesRouter,
    mutations: eventTypesRouter,
  }),
  availability: router({
    queries: availabilityRouter,
  }),
  teams: router({
    queries: teamsRouter,
    mutations: teamsRouter,
  }),
  timezones: timezonesRouter,
  organizations: router({
    queries: organizationsRouter,
    mutations: organizationsRouter,
  }),
  delegationCredential: router({
    queries: delegationCredentialRouter,
    mutations: delegationCredentialRouter,
  }),
  webhook: router({
    queries: webhookRouter,
    mutations: webhookRouter,
  }),
  apiKeys: router({
    queries: apiKeysRouter,
    mutations: apiKeysRouter,
  }),
  slots: router({
    queries: slotsRouter,
    mutations: slotsRouter,
  }),
  workflows: router({
    queries: workflowsRouter,
    mutations: workflowsRouter,
  }),
  saml: router({
    queries: ssoRouter,
    mutations: ssoRouter,
  }),
  dsync: router({
    queries: dsyncRouter,
    mutations: dsyncRouter,
  }),
  i18n: router({
    queries: i18nRouter,
  }),
  insights: insightsRouter,
  payments: router({
    mutations: paymentsRouter,
  }),
  filterSegments: router({
    queries: filterSegmentsRouter,
    mutations: filterSegmentsRouter,
  }),
  // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
  // After that there would just one merge call here for all the apps.
  appRoutingForms: app_RoutingForms,
  appBasecamp3: app_Basecamp3,
  features: featureFlagRouter,
  users: userAdminRouter,
  oAuth: router({
    queries: oAuthRouter,
    mutations: oAuthRouter,
  }),
  googleWorkspace: router({
    queries: googleWorkspaceRouter,
    mutations: googleWorkspaceRouter,
  }),
  admin: router({
    queries: adminRouter,
    mutations: adminRouter,
  }),
  attributes: router({
    queries: attributesRouter,
    mutations: attributesRouter,
  }),
  routingForms: router({
    mutations: routingFormsRouter,
  }),
  credits: router({
    queries: creditsRouter,
    mutations: creditsRouter,
  }),
  ooo: router({
    queries: oooRouter,
    mutations: oooRouter,
  }),
  travelSchedules: router({
    queries: travelSchedulesRouter,
  }),
  aiVoiceAgent: router({
    queries: aiVoiceAgentRouter,
    mutations: aiVoiceAgentRouter,
  }),
  phoneNumber: router({
    queries: phoneNumberRouter,
    mutations: phoneNumberRouter,
  }),
});
