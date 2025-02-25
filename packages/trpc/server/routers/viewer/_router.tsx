const globalForTrpc = global as unknown as {
  mergedRouters;
};

console.log("---------------LOADING the _router");

if (globalForTrpc.mergedRouters) {
  console.log("--------------_CACHED ROUTER");
}

if (!globalForTrpc.mergedRouters) {
  const app_Basecamp3 = await import("@calcom/app-store/basecamp3/trpc-router");
  const app_RoutingForms = await import("@calcom/app-store/routing-forms/trpc-router");
  const { userAdminRouter } = await import("@calcom/features/ee/users/server/trpc-router");
  const { featureFlagRouter } = await import("@calcom/features/flags/server/router");
  const { insightsRouter } = await import("@calcom/features/insights/server/trpc-router");

  const { mergeRouters, router } = await import("../../trpc");
  const { loggedInViewerRouter } = await import("../loggedInViewer/_router");
  const { publicViewerRouter } = await import("../publicViewer/_router");
  const { timezonesRouter } = await import("../publicViewer/timezones/_router");
  const { adminRouter } = await import("./admin/_router");
  const { apiKeysRouter } = await import("./apiKeys/_router");
  const { appsRouter } = await import("./apps/_router");
  const { attributesRouter } = await import("./attributes/_router");
  const { authRouter } = await import("./auth/_router");
  const { availabilityRouter } = await import("./availability/_router");
  const { bookingsRouter } = await import("./bookings/_router");
  const { deploymentSetupRouter } = await import("./deploymentSetup/_router");
  const { domainWideDelegationRouter } = await import("./domainWideDelegation/_router");
  const { dsyncRouter } = await import("./dsync/_router");
  const { eventTypesRouter } = await import("./eventTypes/_router");
  const { googleWorkspaceRouter } = await import("./googleWorkspace/_router");
  const { highPerfRouter } = await import("./highPerf/_router");
  const { oAuthRouter } = await import("./oAuth/_router");
  const { viewerOrganizationsRouter } = await import("./organizations/_router");
  const { paymentsRouter } = await import("./payments/_router");
  const { routingFormsRouter } = await import("./routing-forms/_router");
  const { slotsRouter } = await import("./slots/_router");
  const { ssoRouter } = await import("./sso/_router");
  const { viewerTeamsRouter } = await import("./teams/_router");
  const { webhookRouter } = await import("./webhook/_router");
  const { workflowsRouter } = await import("./workflows/_router");

  console.log("--------------------------loading mergedRouters");
  globalForTrpc.mergedRouters = mergeRouters(
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
      timezones: timezonesRouter,
      organizations: viewerOrganizationsRouter,
      domainWideDelegation: domainWideDelegationRouter,
      webhook: webhookRouter,
      apiKeys: apiKeysRouter,
      slots: slotsRouter,
      workflows: workflowsRouter,
      saml: ssoRouter,
      dsync: dsyncRouter,
      insights: insightsRouter,
      payments: paymentsRouter,
      // NOTE: Add all app related routes in the bottom till the problem described in @calcom/app-store/trpc-routers.ts is solved.
      // After that there would just one merge call here for all the apps.
      appRoutingForms: app_RoutingForms,
      appBasecamp3: app_Basecamp3,
      features: featureFlagRouter,
      appsRouter,
      users: userAdminRouter,
      oAuth: oAuthRouter,
      googleWorkspace: googleWorkspaceRouter,
      admin: adminRouter,
      attributes: attributesRouter,
      highPerf: highPerfRouter,
      routingForms: routingFormsRouter,
    })
  );
}

export const viewerRouter = globalForTrpc.mergedRouters;
