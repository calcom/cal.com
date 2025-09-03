import app_Basecamp3 from "@calcom/app-store/basecamp3/trpc-router";
import app_RoutingForms from "@calcom/app-store/routing-forms/trpc-router";

import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAppByIdInputSchema } from "./apps/appById.schema";
import { ZListLocalInputSchema } from "./apps/listLocal.schema";
import { ZLocationOptionsInputSchema } from "./apps/locationOptions.schema";
import { ZQueryForDependenciesInputSchema } from "./apps/queryForDependencies.schema";
import { ZSaveKeysInputSchema } from "./apps/saveKeys.schema";
import { ZSetDefaultConferencingAppSchema } from "./apps/setDefaultConferencingApp.schema";
import { ZToggleInputSchema } from "./apps/toggle.schema";
import { ZUpdateUserDefaultConferencingAppInputSchema } from "./apps/updateUserDefaultConferencingApp.schema";
import { ZConfirmInputSchema } from "./bookings/confirm.schema";
import { ZEditLocationInputSchema } from "./bookings/editLocation.schema";
import { ZRequestRescheduleInputSchema } from "./bookings/requestReschedule.schema";
import { ZCreateInputSchema } from "./eventTypes/create.schema";
import { ZUpdateInputSchema } from "./eventTypes/update.schema";
import { ZUpdateProfileInputSchema } from "./me/updateProfile.schema";
import { ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema } from "./misc/findTeamMembersMatchingAttributeLogicOfRoute.schema";
import { ZGetMeetingInformationInputSchema } from "./misc/getMeetingInformation.schema";
import { ZGetUserConnectedAppsInputSchema } from "./misc/getUserConnectedApps.schema";
import { ZGoogleWorkspaceInputSchema } from "./misc/googleWorkspace.schema";
import { ZOutOfOfficeInputSchema } from "./misc/outOfOfficeCreateOrUpdate.schema";
import { ZPublishInputSchema } from "./misc/publish.schema";
import { ZResponseInputSchema } from "./misc/response.schema";
import { ZWorkflowOrderInputSchema } from "./misc/workflowOrder.schema";
import { ZChargerCardInputSchema } from "./payments/chargeCard.schema";

type QuarantineRouterHandlerCache = {
  appById?: typeof import("./apps/appById.handler").appByIdHandler;
  listLocal?: typeof import("./apps/listLocal.handler").listLocalHandler;
  saveKeys?: typeof import("./apps/saveKeys.handler").saveKeysHandler;
  toggle?: typeof import("./apps/toggle.handler").toggleHandler;
  setDefaultConferencingApp?: typeof import("./apps/setDefaultConferencingApp.handler").setDefaultConferencingAppHandler;
  updateUserDefaultConferencingApp?: typeof import("./apps/updateUserDefaultConferencingApp.handler").updateUserDefaultConferencingAppHandler;
  locationOptions?: typeof import("./apps/locationOptions.handler").locationOptionsHandler;
  queryForDependencies?: typeof import("./apps/queryForDependencies.handler").queryForDependenciesHandler;

  chargeCard?: typeof import("./payments/chargeCard.handler").chargeCardHandler;

  createEventType?: typeof import("./eventTypes/create.handler").createHandler;
  updateEventType?: typeof import("./eventTypes/update.handler").updateHandler;

  confirmBooking?: typeof import("./bookings/confirm.handler").confirmHandler;
  editBookingLocation?: typeof import("./bookings/editLocation.handler").editLocationHandler;
  requestReschedule?: typeof import("./bookings/requestReschedule.handler").requestRescheduleHandler;

  updateProfile?: typeof import("./me/updateProfile.handler").updateProfileHandler;
  deleteMeWithoutPassword?: typeof import("./me/deleteMeWithoutPassword.handler").deleteMeWithoutPasswordHandler;
  checkForInvalidAppCredentials?: typeof import("./me/checkForInvalidAppCredentials").checkInvalidAppCredentials;

  getMeetingInformation?: typeof import("./misc/getMeetingInformation.handler").getMeetingInformationHandler;
  routingFormsResponse?: typeof import("./misc/response.handler").responseHandler;
  findTeamMembersMatchingAttributeLogicOfRoute?: typeof import("./misc/findTeamMembersMatchingAttributeLogicOfRoute.handler").findTeamMembersMatchingAttributeLogicOfRouteHandler;
  publishOrganization?: typeof import("./misc/publish.handler").publishHandler;
  outOfOfficeCreateOrUpdate?: typeof import("./misc/outOfOfficeCreateOrUpdate.handler").outOfOfficeCreateOrUpdate;
  googleWorkspace?: typeof import("./misc/googleWorkspace.handler").checkForGWorkspace;
  getUserConnectedApps?: typeof import("./misc/getUserConnectedApps.handler").getUserConnectedAppsHandler;
  workflowOrder?: typeof import("./misc/workflowOrder.handler").workflowOrderHandler;
};

const UNSTABLE_HANDLER_CACHE: QuarantineRouterHandlerCache = {};

export const quarantineRouter = router({
  appById: authedProcedure.input(ZAppByIdInputSchema).query(async ({ ctx, input }) => {
    const { appByIdHandler } = await import("./apps/appById.handler");
    return appByIdHandler({ ctx, input });
  }),

  listLocal: authedAdminProcedure.input(ZListLocalInputSchema).query(async ({ ctx, input }) => {
    const { listLocalHandler } = await import("./apps/listLocal.handler");
    return listLocalHandler({ ctx, input });
  }),

  saveKeys: authedAdminProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    const { saveKeysHandler } = await import("./apps/saveKeys.handler");
    return saveKeysHandler({ ctx, input });
  }),

  toggle: authedAdminProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    const { toggleHandler } = await import("./apps/toggle.handler");
    return toggleHandler({ ctx, input });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      const { setDefaultConferencingAppHandler } = await import("./apps/setDefaultConferencingApp.handler");
      return setDefaultConferencingAppHandler({ ctx, input });
    }),

  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateUserDefaultConferencingAppHandler } = await import(
        "./apps/updateUserDefaultConferencingApp.handler"
      );
      return updateUserDefaultConferencingAppHandler({ ctx, input });
    }),

  locationOptions: authedProcedure.input(ZLocationOptionsInputSchema).query(async ({ ctx, input }) => {
    const { locationOptionsHandler } = await import("./apps/locationOptions.handler");
    return locationOptionsHandler({ ctx, input });
  }),

  queryForDependencies: authedProcedure
    .input(ZQueryForDependenciesInputSchema)
    .query(async ({ ctx, input }) => {
      const { queryForDependenciesHandler } = await import("./apps/queryForDependencies.handler");
      return queryForDependenciesHandler({ ctx, input });
    }),

  chargeCard: authedProcedure.input(ZChargerCardInputSchema).mutation(async ({ ctx, input }) => {
    const { chargeCardHandler } = await import("./payments/chargeCard.handler");
    return chargeCardHandler({ ctx, input });
  }),

  createEventType: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./eventTypes/create.handler");
    return createHandler({ ctx, input });
  }),

  updateEventType: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./eventTypes/update.handler");
    return updateHandler({ ctx, input });
  }),

  confirmBooking: authedProcedure.input(ZConfirmInputSchema).mutation(async ({ ctx, input }) => {
    const { confirmHandler } = await import("./bookings/confirm.handler");
    return confirmHandler({ ctx, input });
  }),

  editBookingLocation: authedProcedure.input(ZEditLocationInputSchema).mutation(async ({ ctx, input }) => {
    const { editLocationHandler } = await import("./bookings/editLocation.handler");
    return editLocationHandler({ ctx: ctx as any, input });
  }),

  requestReschedule: authedProcedure.input(ZRequestRescheduleInputSchema).mutation(async ({ ctx, input }) => {
    const { requestRescheduleHandler } = await import("./bookings/requestReschedule.handler");
    return requestRescheduleHandler({ ctx, input });
  }),

  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    const { updateProfileHandler } = await import("./me/updateProfile.handler");
    return updateProfileHandler({ ctx, input });
  }),

  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    const { deleteMeWithoutPasswordHandler } = await import("./me/deleteMeWithoutPassword.handler");
    return deleteMeWithoutPasswordHandler({ ctx });
  }),

  checkForInvalidAppCredentials: authedProcedure.query(async ({ ctx }) => {
    const { checkInvalidAppCredentials } = await import("./me/checkForInvalidAppCredentials");
    return checkInvalidAppCredentials({ ctx });
  }),

  getMeetingInformation: authedProcedure
    .input(ZGetMeetingInformationInputSchema)
    .query(async ({ ctx, input }) => {
      const { getMeetingInformationHandler } = await import("./misc/getMeetingInformation.handler");
      return getMeetingInformationHandler({ ctx, input });
    }),

  routingFormsResponse: authedProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
    const { responseHandler } = await import("./misc/response.handler");
    return responseHandler({ ctx, input });
  }),

  findTeamMembersMatchingAttributeLogicOfRoute: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema)
    .query(async ({ ctx, input }) => {
      const { findTeamMembersMatchingAttributeLogicOfRouteHandler } = await import(
        "./misc/findTeamMembersMatchingAttributeLogicOfRoute.handler"
      );
      return findTeamMembersMatchingAttributeLogicOfRouteHandler({ ctx, input });
    }),

  publishOrganization: authedProcedure.input(ZPublishInputSchema).mutation(async ({ ctx }) => {
    const { publishHandler } = await import("./misc/publish.handler");
    return publishHandler({ ctx });
  }),

  outOfOfficeCreateOrUpdate: authedProcedure
    .input(ZOutOfOfficeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { outOfOfficeCreateOrUpdate } = await import("./misc/outOfOfficeCreateOrUpdate.handler");
      return outOfOfficeCreateOrUpdate({ ctx, input });
    }),

  googleWorkspace: authedProcedure.input(ZGoogleWorkspaceInputSchema).query(async ({ ctx }) => {
    const { checkForGWorkspace } = await import("./misc/googleWorkspace.handler");
    return checkForGWorkspace({ ctx });
  }),

  getUserConnectedApps: authedProcedure
    .input(ZGetUserConnectedAppsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getUserConnectedAppsHandler } = await import("./misc/getUserConnectedApps.handler");
      return getUserConnectedAppsHandler({ ctx, input });
    }),

  workflowOrder: authedProcedure.input(ZWorkflowOrderInputSchema).mutation(async ({ ctx, input }) => {
    const { workflowOrderHandler } = await import("./misc/workflowOrder.handler");
    return workflowOrderHandler({ ctx, input });
  }),

  appRoutingForms: app_RoutingForms,
  appBasecamp3: app_Basecamp3,
});
