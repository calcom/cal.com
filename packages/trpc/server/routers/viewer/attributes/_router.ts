import authedProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { createAttributeSchema } from "./create.schema";

const NAMESPACE = "attributes";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const attributesRouter = router({
  list: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  create: authedProcedure.input(createAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler({ ctx, input });
  }),
});
