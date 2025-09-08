import { authedOrgAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { assignUserToAttributeSchema } from "./assignUserToAttribute.schema";
import { bulkAssignAttributesSchema } from "./bulkAssignAttributes.schema";
import { createAttributeSchema } from "./create.schema";
import { deleteAttributeSchema } from "./delete.schema";
import { editAttributeSchema } from "./edit.schema";
import { toggleActiveSchema } from "./toggleActive.schema";

export const attributesMutationsRouter = router({
  create: authedOrgAdminProcedure.input(createAttributeSchema).mutation(async ({ ctx, input }) => {
    const { default: handler } = await import("./create.handler");
    return handler({ ctx, input });
  }),
  edit: authedOrgAdminProcedure.input(editAttributeSchema).mutation(async ({ ctx, input }) => {
    const { default: handler } = await import("./edit.handler");
    return handler({ ctx, input });
  }),
  delete: authedOrgAdminProcedure.input(deleteAttributeSchema).mutation(async ({ ctx, input }) => {
    const { default: handler } = await import("./delete.handler");
    return handler({ ctx, input });
  }),
  toggleActive: authedOrgAdminProcedure.input(toggleActiveSchema).mutation(async ({ ctx, input }) => {
    const { default: handler } = await import("./toggleActive.handler");
    return handler({ ctx, input });
  }),
  assignUserToAttribute: authedOrgAdminProcedure
    .input(assignUserToAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./assignUserToAttribute.handler");
      return handler({ ctx, input });
    }),
  bulkAssignAttributes: authedOrgAdminProcedure
    .input(bulkAssignAttributesSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./bulkAssignAttributes.handler");
      return handler({ ctx, input });
    }),
});
