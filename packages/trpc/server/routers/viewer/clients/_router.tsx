import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetSchema } from "./get.schema";
import { ZListSchema } from "./list.schema";

export const clientsRouter = router({
  list: authedProcedure.input(ZListSchema).query(async ({ ctx, input }) => {
    const { list } = await import("./list.handler");
    return list({ ctx, input });
  }),
  get: authedProcedure.input(ZGetSchema).query(async ({ ctx, input }) => {
    const { get } = await import("./get.handler");
    return get({ ctx, input });
  }),
});
