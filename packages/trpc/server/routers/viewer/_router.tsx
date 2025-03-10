import { experimental_lazy } from "@trpc/server";

import { mergeRouters, router } from "../../trpc";

loggedInViewerRouter = experimental_lazy(() => import("../loggedInViewer/_router"));

export const viewerRouter = mergeRouters(
  loggedInViewerRouter,

  router({
    loggedInViewerRouter,
    public: experimental_lazy(() => import("../publicViewer/_router")),
    auth: experimental_lazy(() => import("./auth/_router")),
    deploymentSetup: experimental_lazy(() => import("./deploymentSetup/_router")),
    bookings: experimental_lazy(() => import("./bookings/_router")),
    eventTypes: experimental_lazy(() => import("./eventTypes/_router")),
    availability: experimental_lazy(() => import("./availability/_router")),
    teams: experimental_lazy(() => import("./teams/_router")),
    timezones: experimental_lazy(() => import("../publicViewer/timezones/_router")),
    organizations: experimental_lazy(() => import("./organizations/_router")),
    delegationCredential: experimental_lazy(() => import("./delegationCredential/_router")),
    webhook: experimental_lazy(() => import("./webhook/_router")),
    apiKeys: experimental_lazy(() => import("./apiKeys/_router")),
    slots: experimental_lazy(() => import("./slots/_router")),
    workflows: experimental_lazy(() => import("./workflows/_router")),
    saml: experimental_lazy(() => import("./sso/_router")),
    dsync: experimental_lazy(() => import("./dsync/_router")),
    insights: experimental_lazy(() => import("@calcom/features/insights/server/trpc-router")),
    payments: experimental_lazy(() => import("./payments/_router")),
    // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
    // After that there would just one merge call here for all the apps.
    appRoutingForms: experimental_lazy(() => import("@calcom/app-store/routing-forms/trpc-router")),
    appBasecamp3: experimental_lazy(() => import("@calcom/app-store/basecamp3/trpc-router")),
    features: experimental_lazy(() => import("@calcom/features/flags/server/router")),
    appsRouter: experimental_lazy(() => import("./apps/_router")),
    users: experimental_lazy(() => import("@calcom/features/ee/users/server/trpc-router")),
    oAuth: experimental_lazy(() => import("./oAuth/_router")),
    googleWorkspace: experimental_lazy(() => import("./googleWorkspace/_router")),
    admin: experimental_lazy(() => import("./admin/_router")),
    attributes: experimental_lazy(() => import("./attributes/_router")),
    highPerf: experimental_lazy(() => import("./highPerf/_router")),
    routingForms: experimental_lazy(() => import("./routing-forms/_router")),
  })
);
