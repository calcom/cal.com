import authedProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { createAttributeSchema } from "./create.schema";
import { editAttributeSchema } from "./edit.schema";
import { getAttributeSchema } from "./get.schema";
import { toggleActiveSchema } from "./toggleActive.schema";

const NAMESPACE = "attributes";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const attributesRouter = router({
  list: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  get: authedProcedure.input(getAttributeSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  create: authedProcedure.input(createAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler({ ctx, input });
  }),
  edit: authedProcedure.input(editAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("edit"), () => import("./edit.handler"));
    return handler({ ctx, input });
  }),
  toggleActive: authedProcedure.input(toggleActiveSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("toggleActive"), () => import("./toggleActive.handler"));
    return handler({ ctx, input });
  }),
});
