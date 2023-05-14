import authedProcedure from "../../procedures/authedProcedure";
import { router } from "../../trpc";
import { ZAppByIdInputSchema } from "./appById.schema";
import { ZAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
import { ZAppsInputSchema } from "./apps.schema";
import { ZAwayInputSchema } from "./away.schema";
import { ZDeleteCredentialInputSchema } from "./deleteCredential.schema";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { ZEventTypeOrderInputSchema } from "./eventTypeOrder.schema";
import { ZGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
import { ZGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";
import { ZSubmitFeedbackInputSchema } from "./submitFeedback.schema";
import { ZUpdateProfileInputSchema } from "./updateProfile.schema";
import { ZUpdateUserDefaultConferencingAppInputSchema } from "./updateUserDefaultConferencingApp.schema";

type AppsRouterHandlerCache = {
  me?: typeof import("./me.handler").meHandler;
  avatar?: typeof import("./avatar.handler").avatarHandler;
  deleteMe?: typeof import("./deleteMe.handler").deleteMeHandler;
  deleteMeWithoutPassword?: typeof import("./deleteMeWithoutPassword.handler").deleteMeWithoutPasswordHandler;
  away?: typeof import("./away.handler").awayHandler;
  connectedCalendars?: typeof import("./connectedCalendars.handler").connectedCalendarsHandler;
  setDestinationCalendar?: typeof import("./setDestinationCalendar.handler").setDestinationCalendarHandler;
  integrations?: typeof import("./integrations.handler").integrationsHandler;
  appById?: typeof import("./appById.handler").appByIdHandler;
  apps?: typeof import("./apps.handler").appsHandler;
  appCredentialsByType?: typeof import("./appCredentialsByType.handler").appCredentialsByTypeHandler;
  stripeCustomer?: typeof import("./stripeCustomer.handler").stripeCustomerHandler;
  updateProfile?: typeof import("./updateProfile.handler").updateProfileHandler;
  eventTypeOrder?: typeof import("./eventTypeOrder.handler").eventTypeOrderHandler;
  submitFeedback?: typeof import("./submitFeedback.handler").submitFeedbackHandler;
  locationOptions?: typeof import("./locationOptions.handler").locationOptionsHandler;
  deleteCredential?: typeof import("./deleteCredential.handler").deleteCredentialHandler;
  bookingUnconfirmedCount?: typeof import("./bookingUnconfirmedCount.handler").bookingUnconfirmedCountHandler;
  getCalVideoRecordings?: typeof import("./getCalVideoRecordings.handler").getCalVideoRecordingsHandler;
  getDownloadLinkOfCalVideoRecordings?: typeof import("./getDownloadLinkOfCalVideoRecordings.handler").getDownloadLinkOfCalVideoRecordingsHandler;
  getUsersDefaultConferencingApp?: typeof import("./getUsersDefaultConferencingApp.handler").getUsersDefaultConferencingAppHandler;
  updateUserDefaultConferencingApp?: typeof import("./updateUserDefaultConferencingApp.handler").updateUserDefaultConferencingAppHandler;
};

const UNSTABLE_HANDLER_CACHE: AppsRouterHandlerCache = {};

export const loggedInViewerRouter = router({
  me: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.me) {
      UNSTABLE_HANDLER_CACHE.me = (await import("./me.handler")).meHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.me) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.me({ ctx });
  }),

  avatar: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.avatar) {
      UNSTABLE_HANDLER_CACHE.avatar = (await import("./avatar.handler")).avatarHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.avatar) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.avatar({ ctx });
  }),

  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteMe) {
      UNSTABLE_HANDLER_CACHE.deleteMe = (await import("./deleteMe.handler")).deleteMeHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteMe) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteMe({ ctx, input });
  }),

  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword = (
        await import("./deleteMeWithoutPassword.handler")
      ).deleteMeWithoutPasswordHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteMeWithoutPassword({ ctx });
  }),

  away: authedProcedure.input(ZAwayInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.away) {
      UNSTABLE_HANDLER_CACHE.away = (await import("./away.handler")).awayHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.away) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.away({ ctx, input });
  }),

  connectedCalendars: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.connectedCalendars) {
      UNSTABLE_HANDLER_CACHE.connectedCalendars = (
        await import("./connectedCalendars.handler")
      ).connectedCalendarsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.connectedCalendars) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.connectedCalendars({ ctx });
  }),

  setDestinationCalendar: authedProcedure
    .input(ZSetDestinationCalendarInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.setDestinationCalendar) {
        UNSTABLE_HANDLER_CACHE.setDestinationCalendar = (
          await import("./setDestinationCalendar.handler")
        ).setDestinationCalendarHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.setDestinationCalendar) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.setDestinationCalendar({ ctx, input });
    }),

  integrations: authedProcedure.input(ZIntegrationsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      UNSTABLE_HANDLER_CACHE.integrations = (await import("./integrations.handler")).integrationsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.integrations({ ctx, input });
  }),

  appById: authedProcedure.input(ZAppByIdInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.appById) {
      UNSTABLE_HANDLER_CACHE.appById = (await import("./appById.handler")).appByIdHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.appById) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.appById({ ctx, input });
  }),

  apps: authedProcedure.input(ZAppsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.apps) {
      UNSTABLE_HANDLER_CACHE.apps = (await import("./apps.handler")).appsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.apps) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.apps({ ctx, input });
  }),

  appCredentialsByType: authedProcedure
    .input(ZAppCredentialsByTypeInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.appCredentialsByType) {
        UNSTABLE_HANDLER_CACHE.appCredentialsByType = (
          await import("./appCredentialsByType.handler")
        ).appCredentialsByTypeHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.appCredentialsByType) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.appCredentialsByType({ ctx, input });
    }),

  stripeCustomer: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.stripeCustomer) {
      UNSTABLE_HANDLER_CACHE.stripeCustomer = (
        await import("./stripeCustomer.handler")
      ).stripeCustomerHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.stripeCustomer) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.stripeCustomer({ ctx });
  }),

  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      UNSTABLE_HANDLER_CACHE.updateProfile = (await import("./updateProfile.handler")).updateProfileHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.updateProfile) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateProfile({ ctx, input });
  }),

  eventTypeOrder: authedProcedure.input(ZEventTypeOrderInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.eventTypeOrder) {
      UNSTABLE_HANDLER_CACHE.eventTypeOrder = (
        await import("./eventTypeOrder.handler")
      ).eventTypeOrderHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.eventTypeOrder) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.eventTypeOrder({ ctx, input });
  }),

  //Comment for PR: eventTypePosition is not used anywhere
  submitFeedback: authedProcedure.input(ZSubmitFeedbackInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.submitFeedback) {
      UNSTABLE_HANDLER_CACHE.submitFeedback = (
        await import("./submitFeedback.handler")
      ).submitFeedbackHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.submitFeedback) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.submitFeedback({ ctx, input });
  }),

  locationOptions: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      UNSTABLE_HANDLER_CACHE.locationOptions = (
        await import("./locationOptions.handler")
      ).locationOptionsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.locationOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.locationOptions({ ctx });
  }),

  deleteCredential: authedProcedure.input(ZDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteCredential) {
      UNSTABLE_HANDLER_CACHE.deleteCredential = (
        await import("./deleteCredential.handler")
      ).deleteCredentialHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteCredential) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteCredential({ ctx, input });
  }),

  bookingUnconfirmedCount: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount) {
      UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount = (
        await import("./bookingUnconfirmedCount.handler")
      ).bookingUnconfirmedCountHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.bookingUnconfirmedCount({ ctx });
  }),

  getCalVideoRecordings: authedProcedure
    .input(ZGetCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getCalVideoRecordings) {
        UNSTABLE_HANDLER_CACHE.getCalVideoRecordings = (
          await import("./getCalVideoRecordings.handler")
        ).getCalVideoRecordingsHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getCalVideoRecordings) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getCalVideoRecordings({ ctx, input });
    }),

  getDownloadLinkOfCalVideoRecordings: authedProcedure
    .input(ZGetDownloadLinkOfCalVideoRecordingsInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings) {
        UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings = (
          await import("./getDownloadLinkOfCalVideoRecordings.handler")
        ).getDownloadLinkOfCalVideoRecordingsHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.getDownloadLinkOfCalVideoRecordings({ ctx, input });
    }),

  getUsersDefaultConferencingApp: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp) {
      UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp = (
        await import("./getUsersDefaultConferencingApp.handler")
      ).getUsersDefaultConferencingAppHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp({ ctx });
  }),

  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp = (
          await import("./updateUserDefaultConferencingApp.handler")
        ).updateUserDefaultConferencingAppHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp({ ctx, input });
    }),
});
