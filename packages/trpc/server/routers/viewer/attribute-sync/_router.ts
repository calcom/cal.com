import { router } from "../../../trpc";
import { createAttributeSyncSchema } from "./createAttributeSync.schema";
import { updateAttributeSyncSchema } from "./updateAttributeSync.schema";
import { createAttributePbacProcedure } from "./util";

export const attributeSyncRouter = router({
  // Query: Get enabled app credentials (Salesforce, etc.)
  getEnabledAppCredentials: createAttributePbacProcedure("organization.attributes.read").query(
    async (opts) => {
      const { default: handler } = await import("./getEnabledAppCredentials.handler");
      return handler(opts);
    }
  ),

  // Query: Get all attribute sync configurations
  getAllAttributeSyncs: createAttributePbacProcedure("organization.attributes.read").query(async (opts) => {
    const { default: handler } = await import("./getAllAttributeSyncs.handler");
    return handler(opts);
  }),

  createAttributeSync: createAttributePbacProcedure("organization.attributes.create")
    .input(createAttributeSyncSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createAttributeSync.handler");
      return handler(opts);
    }),

  updateAttributeSync: createAttributePbacProcedure("organization.attributes.create")
    .input(updateAttributeSyncSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateAttributeSync.handler");
      return handler(opts);
    }),
});
