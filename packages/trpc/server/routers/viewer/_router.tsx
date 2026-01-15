import { featureFlagRouter } from "@calcom/features/flags/server/router";

import { router } from "../../trpc";
import app_RoutingForms from "../apps/routing-forms/_router";
import { loggedInViewerRouter } from "../loggedInViewer/_router";
import { publicViewerRouter } from "../publicViewer/_router";
import { timezonesRouter } from "../publicViewer/timezones/_router";
import { adminRouter } from "./admin/_router";
import { aiVoiceAgentRouter } from "./aiVoiceAgent/_router";
import { apiKeysRouter } from "./apiKeys/_router";
import { appsRouter } from "./apps/_router";
import { attributesRouter } from "./attributes/_router";
import { attributeSyncRouter } from "./attribute-sync/_router";
import { authRouter } from "./auth/_router";
import { availabilityRouter } from "./availability/_router";
import { bookingsRouter } from "./bookings/_router";
import { calVideoRouter } from "./calVideo/_router";
import { calendarsRouter } from "./calendars/_router";
import { credentialsRouter } from "./credentials/_router";
import { creditsRouter } from "./credits/_router";
import { delegationCredentialRouter } from "./delegationCredential/_router";
import { deploymentSetupRouter } from "./deploymentSetup/_router";
import { dsyncRouter } from "./dsync/_router";
import { eventTypesRouter } from "./eventTypes/_router";
import { eventTypesRouter as heavyEventTypesRouter } from "./eventTypes/heavy/_router";
import { featureOptInRouter } from "./featureOptIn/_router";
import { filterSegmentsRouter } from "./filterSegments/_router";
import { googleWorkspaceRouter } from "./googleWorkspace/_router";
import { holidaysRouter } from "./holidays/_router";
import { i18nRouter } from "./i18n/_router";
import { insightsRouter } from "./insights/_router";
import { meRouter } from "./me/_router";
import { oAuthRouter } from "./oAuth/_router";
import { oooRouter } from "./ooo/_router";
import { viewerOrganizationsRouter } from "./organizations/_router";
import { paymentsRouter } from "./payments/_router";
import { permissionsRouter } from "./pbac/_router";
import { phoneNumberRouter } from "./phoneNumber/_router";
import { routingFormsRouter } from "./routing-forms/_router";
import { slotsRouter } from "./slots/_router";
import { ssoRouter } from "./sso/_router";
import { viewerTeamsRouter } from "./teams/_router";
import { travelSchedulesRouter } from "./travelSchedules/_router";
import { userAdminRouter } from "./users/_router";
import { webhookRouter } from "./webhook/_router";
import { workflowsRouter } from "./workflows/_router";

export const viewerRouter = router({
  loggedInViewerRouter,
  apps: appsRouter,
  me: meRouter,
  public: publicViewerRouter,
  auth: authRouter,
  deploymentSetup: deploymentSetupRouter,
  bookings: bookingsRouter,
  calendars: calendarsRouter,
  calVideo: calVideoRouter,
  credentials: credentialsRouter,
  eventTypes: eventTypesRouter,
  eventTypesHeavy: heavyEventTypesRouter,
  availability: availabilityRouter,
  teams: viewerTeamsRouter,
  timezones: timezonesRouter,
  organizations: viewerOrganizationsRouter,
  delegationCredential: delegationCredentialRouter,
  webhook: webhookRouter,
  apiKeys: apiKeysRouter,
  slots: slotsRouter,
  workflows: workflowsRouter,
  saml: ssoRouter,
  dsync: dsyncRouter,
  i18n: i18nRouter,
  insights: insightsRouter,
  payments: paymentsRouter,
  filterSegments: filterSegmentsRouter,
  pbac: permissionsRouter,
  // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
  // After that there would just one merge call here for all the apps.
  appRoutingForms: app_RoutingForms,
  features: featureFlagRouter,
  featureOptIn: featureOptInRouter,
  users: userAdminRouter,
  oAuth: oAuthRouter,
  googleWorkspace: googleWorkspaceRouter,
  admin: adminRouter,
  attributes: attributesRouter,
  attributeSync: attributeSyncRouter,
  routingForms: routingFormsRouter,
  credits: creditsRouter,
  ooo: oooRouter,
  holidays: holidaysRouter,
  travelSchedules: travelSchedulesRouter,
  aiVoiceAgent: aiVoiceAgentRouter,
  phoneNumber: phoneNumberRouter,
});
