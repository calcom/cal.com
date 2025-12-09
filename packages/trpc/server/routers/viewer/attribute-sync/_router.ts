import { router } from "../../../trpc";
import { getAllAttributeSyncsSchema } from "./getAllAttributeSyncs.schema";
import { getEnabledAppCredentialsSchema } from "./getEnabledAppCredentials.schema";
import { createAttributePbacProcedure } from "./util";

export const attributeSyncRouter = router({
  // Query: Get enabled app credentials (Salesforce, etc.)
  getEnabledAppCredentials: createAttributePbacProcedure("organization.attributes.read")
    .input(getEnabledAppCredentialsSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./getEnabledAppCredentials.handler");
      return handler(opts);
    }),

  // Query: Get all attribute sync configurations
  getAllAttributeSyncs: createAttributePbacProcedure("organization.attributes.read")
    .input(getAllAttributeSyncsSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./getAllAttributeSyncs.handler");
      return handler(opts);
    }),
});
