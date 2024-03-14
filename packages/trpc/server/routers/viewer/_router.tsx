import { lazy } from "@trpc/server/unstable-core-do-not-import";

import { mergeRouters, router } from "../../trpc";
import { loggedInViewerRouter } from "../loggedInViewer/_router";

export const viewerRouter = mergeRouters(
  loggedInViewerRouter,
  router({
    loggedInViewerRouter: lazy(() => import("../loggedInViewer/_router").then((m) => m.loggedInViewerRouter)),
    public: lazy(() => import("../publicViewer/_router").then((m) => m.publicViewerRouter)),
    auth: lazy(() => import("./auth/_router").then((m) => m.authRouter)),
    deploymentSetup: lazy(() => import("./deploymentSetup/_router").then((m) => m.deploymentSetupRouter)),
    bookings: lazy(() => import("./bookings/_router").then((m) => m.bookingsRouter)),
    eventTypes: lazy(() => import("./eventTypes/_router").then((m) => m.eventTypesRouter)),
    availability: lazy(() => import("./availability/_router").then((m) => m.availabilityRouter)),
    teams: lazy(() => import("./teams/_router").then((m) => m.viewerTeamsRouter)),
    organizations: lazy(() => import("./organizations/_router").then((m) => m.viewerOrganizationsRouter)),
    webhook: lazy(() => import("./webhook/_router").then((m) => m.webhookRouter)),
    apiKeys: lazy(() => import("./apiKeys/_router").then((m) => m.apiKeysRouter)),
    slots: lazy(() => import("./slots/_router").then((m) => m.slotsRouter)),
    workflows: lazy(() => import("./workflows/_router").then((m) => m.workflowsRouter)),
    saml: lazy(() => import("./sso/_router").then((m) => m.ssoRouter)),
    dsync: lazy(() => import("./dsync/_router").then((m) => m.dsyncRouter)),
    insights: lazy(() =>
      import("@calcom/features/insights/server/trpc-router").then((m) => m.insightsRouter)
    ),
    payments: lazy(() => import("./payments/_router").then((m) => m.paymentsRouter)),
    // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
    // After that there would just one merge call here for all the apps.
    appRoutingForms: lazy(() => import("@calcom/app-store/routing-forms/trpc-router").then((m) => m.default)),
    appBasecamp3: lazy(() => import("@calcom/app-store/basecamp3/trpc-router").then((m) => m.default)),
    features: lazy(() => import("@calcom/features/flags/server/router").then((m) => m.featureFlagRouter)),
    appsRouter: lazy(() => import("./apps/_router").then((m) => m.appsRouter)),
    users: lazy(() => import("@calcom/features/ee/users/server/trpc-router").then((m) => m.userAdminRouter)),
    oAuth: lazy(() => import("./oAuth/_router").then((m) => m.oAuthRouter)),
    googleWorkspace: lazy(() => import("./googleWorkspace/_router").then((m) => m.googleWorkspaceRouter)),
    admin: lazy(() => import("./admin/_router").then((m) => m.adminRouter)),
  })
);
