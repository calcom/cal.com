import app_RoutingForms from "@calcom/app-store/routing-forms/trpc-router";
import { userAdminRouter } from "@calcom/features/ee/users/server/trpc-router";
import { featureFlagRouter } from "@calcom/features/flags/server/router";
import { insightsRouter } from "@calcom/features/insights/server/trpc-router";

import { mergeRouters, router } from "../../trpc";
import { loggedInViewerRouter } from "../loggedInViewer/_router";
import { publicViewerRouter } from "../publicViewer/_router";
import { apiKeysRouter } from "./apiKeys/_router";
import { appsRouter } from "./apps/_router";
import { authRouter } from "./auth/_router";
import { availabilityRouter } from "./availability/_router";
import { bookingsRouter } from "./bookings/_router";
import { deploymentSetupRouter } from "./deploymentSetup/_router";
import { eventTypesRouter } from "./eventTypes/_router";
import { googleWorkspaceRouter } from "./googleWorkspace/_router";
import { paymentsRouter } from "./payments/_router";
import { slotsRouter } from "./slots/_router";
import { ssoRouter } from "./sso/_router";
import { viewerTeamsRouter } from "./teams/_router";
import { webhookRouter } from "./webhook/_router";
import { workflowsRouter } from "./workflows/_router";

export const viewerRouter = mergeRouters(
  loggedInViewerRouter,
  router({
    loggedInViewerRouter,
    public: publicViewerRouter,
    auth: authRouter,
    deploymentSetup: deploymentSetupRouter,
    bookings: bookingsRouter,
    eventTypes: eventTypesRouter,
    availability: availabilityRouter,
    teams: viewerTeamsRouter,
    webhook: webhookRouter,
    apiKeys: apiKeysRouter,
    slots: slotsRouter,
    workflows: workflowsRouter,
    saml: ssoRouter,
    insights: insightsRouter,
    payments: paymentsRouter,
    // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
    // After that there would just one merge call here for all the apps.
    appRoutingForms: app_RoutingForms,
    features: featureFlagRouter,
    appsRouter,
    users: userAdminRouter,
    googleWorkspace: googleWorkspaceRouter,
  })
);
