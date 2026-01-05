import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetTeamByIdSchema } from "./getById.schema";
import { ZGetMembersSchema } from "./getMembers.schema";
import { ZGetStatsSchema } from "./getStats.schema";
import { ZListTeamsSchema } from "./list.schema";
import { ZGetInvoicesSchema } from "./stripe/getInvoices.schema";
import { ZGetPaymentsSchema } from "./stripe/getPayments.schema";
import { ZGetSubscriptionSchema } from "./stripe/getSubscription.schema";
import { ZSendInvoiceReminderSchema } from "./stripe/sendInvoiceReminder.schema";

export const adminTeamsRouter = router({
  // List teams with pagination and filters
  list: authedAdminProcedure.input(ZListTeamsSchema).query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),

  // Get detailed team info
  getById: authedAdminProcedure.input(ZGetTeamByIdSchema).query(async (opts) => {
    const { default: handler } = await import("./getById.handler");
    return handler(opts);
  }),

  // Get team members (TODO: implement)
  getMembers: authedAdminProcedure.input(ZGetMembersSchema).query(async (opts) => {
    // For now, return empty - we'll implement this later
    return { members: [], nextCursor: undefined };
  }),

  // Get team statistics (TODO: implement)
  getStats: authedAdminProcedure.input(ZGetStatsSchema).query(async (opts) => {
    // For now, return empty - we'll implement this later
    return { stats: {} };
  }),

  // Stripe sub-router
  stripe: router({
    getInvoices: authedAdminProcedure.input(ZGetInvoicesSchema).query(async (opts) => {
      const { default: handler } = await import("./stripe/getInvoices.handler");
      return handler(opts);
    }),

    getPayments: authedAdminProcedure.input(ZGetPaymentsSchema).query(async (opts) => {
      const { default: handler } = await import("./stripe/getPayments.handler");
      return handler(opts);
    }),

    getSubscription: authedAdminProcedure.input(ZGetSubscriptionSchema).query(async (opts) => {
      const { default: handler } = await import("./stripe/getSubscription.handler");
      return handler(opts);
    }),

    sendInvoiceReminder: authedAdminProcedure.input(ZSendInvoiceReminderSchema).mutation(async (opts) => {
      const { default: handler } = await import("./stripe/sendInvoiceReminder.handler");
      return handler(opts);
    }),
  }),
});
