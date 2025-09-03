import { z } from "zod";

import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { bookingsProcedure } from "../bookings/util";
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
import { ZOutOfOfficeCreateOrUpdateInputSchema } from "./misc/outOfOfficeCreateOrUpdate.schema";
import { ZPublishInputSchema } from "./misc/publish.schema";
import { ZResponseInputSchema } from "./misc/response.schema";
import { ZWorkflowOrderInputSchema } from "./misc/workflowOrder.schema";
import { ZChargerCardInputSchema } from "./payments/chargeCard.schema";

type QuarantineRouterHandlerCache = {
  appById?: typeof import("./apps/appById.handler").appByIdHandler;
  listLocal?: typeof import("./apps/listLocal.handler").listLocalHandler;
  locationOptions?: typeof import("./apps/locationOptions.handler").locationOptionsHandler;
  queryForDependencies?: typeof import("./apps/queryForDependencies.handler").queryForDependenciesHandler;
  saveKeys?: typeof import("./apps/saveKeys.handler").saveKeysHandler;
  setDefaultConferencingApp?: typeof import("./apps/setDefaultConferencingApp.handler").setDefaultConferencingAppHandler;
  toggle?: typeof import("./apps/toggle.handler").toggleHandler;
  updateUserDefaultConferencingApp?: typeof import("./apps/updateUserDefaultConferencingApp.handler").updateUserDefaultConferencingAppHandler;

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
  publishTeam?: typeof import("./misc/publish.handler").publishHandler;
  outOfOfficeCreateOrUpdate?: typeof import("./misc/outOfOfficeCreateOrUpdate.handler").outOfOfficeCreateOrUpdate;
  googleWorkspace?: typeof import("./misc/googleWorkspace.handler").checkForGWorkspace;
  getUserConnectedApps?: typeof import("./misc/getUserConnectedApps.handler").getUserConnectedAppsHandler;
  workflowOrder?: typeof import("./misc/workflowOrder.handler").workflowOrderHandler;
};

const UNSTABLE_HANDLER_CACHE: QuarantineRouterHandlerCache = {};

export const quarantineRouter = router({
  appById: authedProcedure.input(ZAppByIdInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.appById) {
      UNSTABLE_HANDLER_CACHE.appById = await import("./apps/appById.handler").then(
        (mod) => mod.appByIdHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.appById) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.appById({
      ctx,
      input,
    });
  }),

  listLocal: authedAdminProcedure.input(ZListLocalInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      UNSTABLE_HANDLER_CACHE.listLocal = await import("./apps/listLocal.handler").then(
        (mod) => mod.listLocalHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listLocal({
      ctx,
      input,
    });
  }),

  locationOptions: authedProcedure.input(ZLocationOptionsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      UNSTABLE_HANDLER_CACHE.locationOptions = await import("./apps/locationOptions.handler").then(
        (mod) => mod.locationOptionsHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.locationOptions({
      ctx,
      input,
    });
  }),

  queryForDependencies: authedProcedure
    .input(ZQueryForDependenciesInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        UNSTABLE_HANDLER_CACHE.queryForDependencies = await import(
          "./apps/queryForDependencies.handler"
        ).then((mod) => mod.queryForDependenciesHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.queryForDependencies({
        ctx,
        input,
      });
    }),

  saveKeys: authedProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      UNSTABLE_HANDLER_CACHE.saveKeys = await import("./apps/saveKeys.handler").then(
        (mod) => mod.saveKeysHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.saveKeys({
      ctx,
      input,
    });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp = await import(
          "./apps/setDefaultConferencingApp.handler"
        ).then((mod) => mod.setDefaultConferencingAppHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp({
        ctx,
        input,
      });
    }),

  toggle: authedProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      UNSTABLE_HANDLER_CACHE.toggle = await import("./apps/toggle.handler").then((mod) => mod.toggleHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.toggle({
      ctx,
      input,
    });
  }),

  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp = await import(
          "./apps/updateUserDefaultConferencingApp.handler"
        ).then((mod) => mod.updateUserDefaultConferencingAppHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp({
        ctx,
        input,
      });
    }),

  chargeCard: authedProcedure.input(ZChargerCardInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.chargeCard) {
      UNSTABLE_HANDLER_CACHE.chargeCard = await import("./payments/chargeCard.handler").then(
        (mod) => mod.chargeCardHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.chargeCard) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.chargeCard({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.createEventType) {
      UNSTABLE_HANDLER_CACHE.createEventType = await import("./eventTypes/create.handler").then(
        (mod) => mod.createHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.createEventType) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.createEventType({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateEventType) {
      UNSTABLE_HANDLER_CACHE.updateEventType = await import("./eventTypes/update.handler").then(
        (mod) => mod.updateHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.updateEventType) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateEventType({
      ctx,
      input,
    });
  }),

  confirm: authedProcedure.input(ZConfirmInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.confirmBooking) {
      UNSTABLE_HANDLER_CACHE.confirmBooking = await import("./bookings/confirm.handler").then(
        (mod) => mod.confirmHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.confirmBooking) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.confirmBooking({
      ctx,
      input,
    });
  }),

  editLocation: bookingsProcedure.input(ZEditLocationInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.editBookingLocation) {
      UNSTABLE_HANDLER_CACHE.editBookingLocation = await import("./bookings/editLocation.handler").then(
        (mod) => mod.editLocationHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.editBookingLocation) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.editBookingLocation({
      ctx,
      input,
    });
  }),

  requestReschedule: authedProcedure.input(ZRequestRescheduleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.requestReschedule) {
      UNSTABLE_HANDLER_CACHE.requestReschedule = await import("./bookings/requestReschedule.handler").then(
        (mod) => mod.requestRescheduleHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.requestReschedule) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.requestReschedule({
      ctx,
      input,
    });
  }),

  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      UNSTABLE_HANDLER_CACHE.updateProfile = await import("./me/updateProfile.handler").then(
        (mod) => mod.updateProfileHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateProfile({
      ctx,
      input,
    });
  }),

  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword = await import(
        "./me/deleteMeWithoutPassword.handler"
      ).then((mod) => mod.deleteMeWithoutPasswordHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword({
      ctx,
    });
  }),

  checkForInvalidAppCredentials: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkForInvalidAppCredentials) {
      UNSTABLE_HANDLER_CACHE.checkForInvalidAppCredentials = await import(
        "./me/checkForInvalidAppCredentials"
      ).then((mod) => mod.checkInvalidAppCredentials);
    }

    if (!UNSTABLE_HANDLER_CACHE.checkForInvalidAppCredentials) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkForInvalidAppCredentials({
      ctx,
    });
  }),

  getMeetingInformation: authedProcedure
    .input(ZGetMeetingInformationInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getMeetingInformation) {
        UNSTABLE_HANDLER_CACHE.getMeetingInformation = await import(
          "./misc/getMeetingInformation.handler"
        ).then((mod) => mod.getMeetingInformationHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.getMeetingInformation) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getMeetingInformation({
        ctx,
        input,
      });
    }),

  response: authedProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.routingFormsResponse) {
      UNSTABLE_HANDLER_CACHE.routingFormsResponse = await import("./misc/response.handler").then(
        (mod) => mod.responseHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.routingFormsResponse) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.routingFormsResponse({
      ctx,
      input,
    });
  }),

  findTeamMembersMatchingAttributeLogicOfRoute: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.findTeamMembersMatchingAttributeLogicOfRoute) {
        UNSTABLE_HANDLER_CACHE.findTeamMembersMatchingAttributeLogicOfRoute = await import(
          "./misc/findTeamMembersMatchingAttributeLogicOfRoute.handler"
        ).then((mod) => mod.findTeamMembersMatchingAttributeLogicOfRouteHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.findTeamMembersMatchingAttributeLogicOfRoute) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.findTeamMembersMatchingAttributeLogicOfRoute({
        ctx,
        input,
      });
    }),

  publish: authedProcedure.input(ZPublishInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.publishTeam) {
      UNSTABLE_HANDLER_CACHE.publishTeam = await import("./misc/publish.handler").then(
        (mod) => mod.publishHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.publishTeam) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.publishTeam({
      ctx,
      input,
    });
  }),

  outOfOfficeCreateOrUpdate: authedProcedure
    .input(ZOutOfOfficeCreateOrUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.outOfOfficeCreateOrUpdate) {
        UNSTABLE_HANDLER_CACHE.outOfOfficeCreateOrUpdate = await import(
          "./misc/outOfOfficeCreateOrUpdate.handler"
        ).then((mod) => mod.outOfOfficeCreateOrUpdate);
      }

      if (!UNSTABLE_HANDLER_CACHE.outOfOfficeCreateOrUpdate) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.outOfOfficeCreateOrUpdate({
        ctx,
        input,
      });
    }),

  googleWorkspace: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.googleWorkspace) {
      UNSTABLE_HANDLER_CACHE.googleWorkspace = await import("./misc/googleWorkspace.handler").then(
        (mod) => mod.checkForGWorkspace
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.googleWorkspace) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.googleWorkspace({
      ctx,
    });
  }),

  getUserConnectedApps: authedProcedure
    .input(ZGetUserConnectedAppsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getUserConnectedApps) {
        UNSTABLE_HANDLER_CACHE.getUserConnectedApps = await import(
          "./misc/getUserConnectedApps.handler"
        ).then((mod) => mod.getUserConnectedAppsHandler);
      }

      if (!UNSTABLE_HANDLER_CACHE.getUserConnectedApps) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getUserConnectedApps({
        ctx,
        input,
      });
    }),

  workflowOrder: authedProcedure.input(ZWorkflowOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      UNSTABLE_HANDLER_CACHE.workflowOrder = await import("./misc/workflowOrder.handler").then(
        (mod) => mod.workflowOrderHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.workflowOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.workflowOrder({
      ctx,
      input,
    });
  }),

  appRoutingForms: router({
    forms: authedProcedure.input(z.any()).query(async ({ ctx, input }) => {
      const { default: formsHandler } = await import("@calcom/app-store/routing-forms/trpc/forms.handler");
      return formsHandler({ ctx, input });
    }),

    formQuery: authedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const { default: formQueryHandler } = await import(
        "@calcom/app-store/routing-forms/trpc/formQuery.handler"
      );
      return formQueryHandler({ ctx, input });
    }),

    formMutation: authedProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
      const { default: formMutationHandler } = await import(
        "@calcom/app-store/routing-forms/trpc/formMutation.handler"
      );
      return formMutationHandler({ ctx, input });
    }),

    deleteForm: authedProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
      const { default: deleteFormHandler } = await import(
        "@calcom/app-store/routing-forms/trpc/deleteForm.handler"
      );
      return deleteFormHandler({ ctx, input });
    }),

    response: authedProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      const { responseHandler } = await import("./misc/response.handler");
      return responseHandler({ ctx, input });
    }),

    getIncompleteBookingSettings: authedProcedure
      .input(z.object({ formId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { default: getIncompleteBookingSettingsHandler } = await import(
          "@calcom/app-store/routing-forms/trpc/getIncompleteBookingSettings.handler"
        );
        return getIncompleteBookingSettingsHandler({ ctx, input });
      }),

    saveIncompleteBookingSettings: authedProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
      const { default: saveIncompleteBookingSettingsHandler } = await import(
        "@calcom/app-store/routing-forms/trpc/saveIncompleteBookingSettings.handler"
      );
      return saveIncompleteBookingSettingsHandler({ ctx, input });
    }),

    getAttributesForTeam: authedProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { default: getAttributesForTeamHandler } = await import(
          "@calcom/app-store/routing-forms/trpc/getAttributesForTeam.handler"
        );
        return getAttributesForTeamHandler({ ctx, input });
      }),

    getResponseWithFormFields: authedProcedure
      .input(z.object({ formResponseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { default: getResponseWithFormFieldsHandler } = await import(
          "@calcom/app-store/routing-forms/trpc/getResponseWithFormFields.handler"
        );
        return getResponseWithFormFieldsHandler({ ctx, input });
      }),
  }),

  appBasecamp3: router({
    projects: authedProcedure.query(async ({ ctx }) => {
      const { projectHandler } = await import("@calcom/app-store/basecamp3/trpc/projects.handler");
      return projectHandler({ ctx: { prisma: ctx.prisma, user: ctx.user } });
    }),

    projectMutation: authedProcedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { projectMutationHandler } = await import(
          "@calcom/app-store/basecamp3/trpc/projectMutation.handler"
        );
        return projectMutationHandler({ ctx: { prisma: ctx.prisma, user: ctx.user }, input });
      }),
  }),
});
