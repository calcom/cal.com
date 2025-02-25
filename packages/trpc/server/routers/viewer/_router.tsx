import { mergeRouters, router } from "../../trpc";

let _viewerRouter: ReturnType<typeof mergeRouters> | null = null;

async function initializeViewerRouter() {
  if (_viewerRouter) {
    return _viewerRouter;
  }

  const [
    app_Basecamp3Module,
    app_RoutingFormsModule,
    userAdminRouterModule,
    featureFlagRouterModule,
    insightsRouterModule,
    loggedInViewerRouterModule,
    publicViewerRouterModule,
    timezonesRouterModule,
    adminRouterModule,
    apiKeysRouterModule,
    appsRouterModule,
    attributesRouterModule,
    authRouterModule,
    availabilityRouterModule,
    bookingsRouterModule,
    deploymentSetupRouterModule,
    domainWideDelegationRouterModule,
    dsyncRouterModule,
    eventTypesRouterModule,
    googleWorkspaceRouterModule,
    highPerfRouterModule,
    oAuthRouterModule,
    viewerOrganizationsRouterModule,
    paymentsRouterModule,
    routingFormsRouterModule,
    slotsRouterModule,
    ssoRouterModule,
    viewerTeamsRouterModule,
    webhookRouterModule,
    workflowsRouterModule,
  ] = await Promise.all([
    import("@calcom/app-store/basecamp3/trpc-router"),
    import("@calcom/app-store/routing-forms/trpc-router"),
    import("@calcom/features/ee/users/server/trpc-router"),
    import("@calcom/features/flags/server/router"),
    import("@calcom/features/insights/server/trpc-router"),
    import("../loggedInViewer/_router"),
    import("../publicViewer/_router"),
    import("../publicViewer/timezones/_router"),
    import("./admin/_router"),
    import("./apiKeys/_router"),
    import("./apps/_router"),
    import("./attributes/_router"),
    import("./auth/_router"),
    import("./availability/_router"),
    import("./bookings/_router"),
    import("./deploymentSetup/_router"),
    import("./domainWideDelegation/_router"),
    import("./dsync/_router"),
    import("./eventTypes/_router"),
    import("./googleWorkspace/_router"),
    import("./highPerf/_router"),
    import("./oAuth/_router"),
    import("./organizations/_router"),
    import("./payments/_router"),
    import("./routing-forms/_router"),
    import("./slots/_router"),
    import("./sso/_router"),
    import("./teams/_router"),
    import("./webhook/_router"),
    import("./workflows/_router"),
  ]);

  const app_Basecamp3 = app_Basecamp3Module.default; // Assuming default export
  const app_RoutingForms = app_RoutingFormsModule.default;
  const userAdminRouter = userAdminRouterModule.userAdminRouter; // Correct access
  const featureFlagRouter = featureFlagRouterModule.featureFlagRouter;
  const insightsRouter = insightsRouterModule.insightsRouter;
  const loggedInViewerRouter = loggedInViewerRouterModule.loggedInViewerRouter;
  const publicViewerRouter = publicViewerRouterModule.publicViewerRouter;
  const timezonesRouter = timezonesRouterModule.timezonesRouter;
  const adminRouter = adminRouterModule.adminRouter;
  const apiKeysRouter = apiKeysRouterModule.apiKeysRouter;
  const appsRouter = appsRouterModule.appsRouter;
  const attributesRouter = attributesRouterModule.attributesRouter;
  const authRouter = authRouterModule.authRouter;
  const availabilityRouter = availabilityRouterModule.availabilityRouter;
  const bookingsRouter = bookingsRouterModule.bookingsRouter;
  const deploymentSetupRouter = deploymentSetupRouterModule.deploymentSetupRouter;
  const domainWideDelegationRouter = domainWideDelegationRouterModule.domainWideDelegationRouter;
  const dsyncRouter = dsyncRouterModule.dsyncRouter;
  const eventTypesRouter = eventTypesRouterModule.eventTypesRouter;
  const googleWorkspaceRouter = googleWorkspaceRouterModule.googleWorkspaceRouter;
  const highPerfRouter = highPerfRouterModule.highPerfRouter;
  const oAuthRouter = oAuthRouterModule.oAuthRouter;
  const viewerOrganizationsRouter = viewerOrganizationsRouterModule.viewerOrganizationsRouter;
  const paymentsRouter = paymentsRouterModule.paymentsRouter;
  const routingFormsRouter = routingFormsRouterModule.routingFormsRouter;
  const slotsRouter = slotsRouterModule.slotsRouter;
  const ssoRouter = ssoRouterModule.ssoRouter;
  const viewerTeamsRouter = viewerTeamsRouterModule.viewerTeamsRouter;
  const webhookRouter = webhookRouterModule.webhookRouter;
  const workflowsRouter = workflowsRouterModule.workflowsRouter;

  console.log("--------------------------loading mergedRouters");
  _viewerRouter = mergeRouters(
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

  return _viewerRouter;
}

export async function getViewerRouter() {
  return initializeViewerRouter();
}
