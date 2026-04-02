import type { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { assignUserToAttributeSchema } from "./assignUserToAttribute.schema";
import { bulkAssignAttributesSchema } from "./bulkAssignAttributes.schema";
import { createAttributeSchema } from "./create.schema";
import { deleteAttributeSchema } from "./delete.schema";
import { editAttributeSchema } from "./edit.schema";
import { ZFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";
import { getAttributeSchema } from "./get.schema";
import { getByUserIdSchema } from "./getByUserId.schema";
import { toggleActiveSchema } from "./toggleActive.schema";
import { createAttributePbacProcedure } from "./util";

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;

export const attributesRouter = router({
  list: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  get: authedProcedure.input(getAttributeSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  getByUserId: authedProcedure.input(getByUserIdSchema).query(async ({ ctx, input }) => {
    const { default: handler } = await import("./getByUserId.handler");
    return handler({ ctx, input });
  }),
  // Mutations
  create: createAttributePbacProcedure("organization.attributes.create")
    .input(createAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./create.handler");
      return handler({ ctx, input });
    }),
  edit: createAttributePbacProcedure("organization.attributes.update")
    .input(editAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./edit.handler");
      return handler({ ctx, input });
    }),
  delete: createAttributePbacProcedure("organization.attributes.delete")
    .input(deleteAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./delete.handler");
      return handler({ ctx, input });
    }),
  toggleActive: createAttributePbacProcedure("organization.attributes.update")
    .input(toggleActiveSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./toggleActive.handler");
      return handler({ ctx, input });
    }),

  assignUserToAttribute: createAttributePbacProcedure("organization.attributes.editUsers")
    .input(assignUserToAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./assignUserToAttribute.handler");
      return handler({ ctx, input });
    }),

  bulkAssignAttributes: createAttributePbacProcedure("organization.attributes.editUsers")
    .input(bulkAssignAttributesSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./bulkAssignAttributes.handler");
      return handler({ ctx, input });
    }),

  findTeamMembersMatchingAttributeLogic: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicInputSchema)
    .query(async ({ ctx, input }) => {
      const { default: handler } = await import("./findTeamMembersMatchingAttributeLogic.handler");
      return handler({ ctx, input });
    }),
});
