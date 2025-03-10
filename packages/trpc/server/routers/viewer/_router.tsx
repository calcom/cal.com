import { experimental_lazy } from "@trpc/server";

import { mergeRouters, router } from "../../trpc";

const loggedInViewerRouter = experimental_lazy(() =>
  import("../loggedInViewer/_router").then((mod) => mod.loggedInViewerRouter)
);

export const viewerRouter = mergeRouters(
  loggedInViewerRouter,

  router({
    loggedInViewerRouter,
    public: experimental_lazy(() => import("../publicViewer/_router").then((mod) => mod.publicViewerRouter)),
    auth: experimental_lazy(() => import("./auth/_router").then((mod) => mod.authRouter)),
    deploymentSetup: experimental_lazy(() =>
      import("./deploymentSetup/_router").then((mod) => mod.deploymentSetupRouter)
    ),
    bookings: experimental_lazy(() => import("./bookings/_router").then((mod) => mod.bookingsRouter)),
    eventTypes: experimental_lazy(() => import("./eventTypes/_router").then((mod) => mod.eventTypesRouter)),
    availability: experimental_lazy(() =>
      import("./availability/_router").then((mod) => mod.availabilityRouter)
    ),
    teams: experimental_lazy(() => import("./teams/_router").then((mod) => mod.viewerTeamsRouter)),
    timezones: experimental_lazy(() =>
      import("../publicViewer/timezones/_router").then((mod) => mod.timezonesRouter)
    ),
    organizations: experimental_lazy(() =>
      import("./organizations/_router").then((mod) => mod.viewerOrganizationsRouter)
    ),
    delegationCredential: experimental_lazy(() =>
      import("./delegationCredential/_router").then((mod) => mod.delegationCredentialRouter)
    ),
    webhook: experimental_lazy(() => import("./webhook/_router").then((mod) => mod.webhookRouter)),
    apiKeys: experimental_lazy(() => import("./apiKeys/_router").then((mod) => mod.apiKeysRouter)),
    slots: experimental_lazy(() => import("./slots/_router").then((mod) => mod.slotsRouter)),
    workflows: experimental_lazy(() => import("./workflows/_router").then((mod) => mod.workflowsRouter)),
    saml: experimental_lazy(() => import("./sso/_router").then((mod) => mod.ssoRouter)),
    dsync: experimental_lazy(() => import("./dsync/_router").then((mod) => mod.dsyncRouter)),
    insights: experimental_lazy(() =>
      import("@calcom/features/insights/server/trpc-router").then((mod) => mod.insightsRouter)
    ),
    payments: experimental_lazy(() => import("./payments/_router").then((mod) => mod.paymentsRouter)),
    // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
    // After that there would just one merge call here for all the apps.
    appRoutingForms: experimental_lazy(() =>
      import("@calcom/app-store/routing-forms/trpc-router").then((mod) => mod.default)
    ),
    appBasecamp3: experimental_lazy(() =>
      import("@calcom/app-store/basecamp3/trpc-router").then((mod) => mod.default)
    ),
    features: experimental_lazy(() =>
      import("@calcom/features/flags/server/router").then((mod) => mod.featureFlagRouter)
    ),
    appsRouter: experimental_lazy(() => import("./apps/_router").then((mod) => mod.appsRouter)),
    users: experimental_lazy(() =>
      import("@calcom/features/ee/users/server/trpc-router").then((mod) => mod.userAdminRouter)
    ),
    oAuth: experimental_lazy(() => import("./oAuth/_router").then((mod) => mod.oAuthRouter)),
    googleWorkspace: experimental_lazy(() =>
      import("./googleWorkspace/_router").then((mod) => mod.googleWorkspaceRouter)
    ),
    admin: experimental_lazy(() => import("./admin/_router").then((mod) => mod.adminRouter)),
    attributes: experimental_lazy(() => import("./attributes/_router").then((mod) => mod.attributesRouter)),
    highPerf: experimental_lazy(() => import("./highPerf/_router").then((mod) => mod.highPerfRouter)),
    routingForms: experimental_lazy(() =>
      import("./routing-forms/_router").then((mod) => mod.routingFormsRouter)
    ),
  })
);
