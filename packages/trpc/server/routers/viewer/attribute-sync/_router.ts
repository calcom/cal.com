import { router } from "../../../trpc";
import { createAttributeSyncSchema } from "./createAttributeSync.schema";
import { deleteAttributeSyncSchema } from "./deleteAttributeSync.schema";
import { getAllAttributeSyncsSchema } from "./getAllAttributeSyncs.schema";
import { updateAttributeSyncSchema } from "./updateAttributeSync.schema";
import { createAttributePbacProcedure } from "./util";

export const attributeSyncRouter = router({
  getAllAttributeSyncs: createAttributePbacProcedure("organization.attributes.read")
    .input(getAllAttributeSyncsSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./getAllAttributeSyncs.handler");
      return handler(opts);
    }),

  createAttributeSync: createAttributePbacProcedure("organization.attributes.create")
    .input(createAttributeSyncSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createAttributeSync.handler");
      return handler(opts);
    }),

  updateAttributeSync: createAttributePbacProcedure("organization.attributes.update")
    .input(updateAttributeSyncSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateAttributeSync.handler");
      return handler(opts);
    }),

  deleteAttributeSync: createAttributePbacProcedure("organization.attributes.delete")
    .input(deleteAttributeSyncSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./deleteAttributeSync.handler");
      return handler(opts);
    }),
});
