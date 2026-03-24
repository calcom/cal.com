import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCalIdContactsCreateInputSchema } from "./create.schema";
import { ZCalIdContactsDeleteInputSchema } from "./delete.schema";
import { ZCalIdContactsGetByIdInputSchema } from "./getById.schema";
import { ZCalIdContactsGetMeetingsByContactIdInputSchema } from "./getMeetingsByContactId.schema";
import { ZCalIdContactsListInputSchema } from "./list.schema";
import { ZCalIdContactsUpdateInputSchema } from "./update.schema";

export const calIdContactsRouter = router({
  list: authedProcedure.input(ZCalIdContactsListInputSchema.optional()).query(async ({ ctx, input }) => {
    const { listCalIdContactsHandler } = await import("./list.handler");

    return listCalIdContactsHandler({
      ctx,
      input,
    });
  }),

  getById: authedProcedure.input(ZCalIdContactsGetByIdInputSchema).query(async ({ ctx, input }) => {
    const { getByIdCalIdContactsHandler } = await import("./getById.handler");

    return getByIdCalIdContactsHandler({
      ctx,
      input,
    });
  }),

  getMeetingsByContactId: authedProcedure
    .input(ZCalIdContactsGetMeetingsByContactIdInputSchema)
    .query(async ({ ctx, input }) => {
      const { getMeetingsByContactIdCalIdContactsHandler } = await import("./getMeetingsByContactId.handler");

      return getMeetingsByContactIdCalIdContactsHandler({
        ctx,
        input,
      });
    }),

  create: authedProcedure.input(ZCalIdContactsCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createCalIdContactsHandler } = await import("./create.handler");

    return createCalIdContactsHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZCalIdContactsUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateCalIdContactsHandler } = await import("./update.handler");

    return updateCalIdContactsHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZCalIdContactsDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteCalIdContactsHandler } = await import("./delete.handler");

    return deleteCalIdContactsHandler({
      ctx,
      input,
    });
  }),
});
