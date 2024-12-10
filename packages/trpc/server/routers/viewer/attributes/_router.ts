import type { z } from "zod";

import authedProcedure, { authedOrgAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { assignUserToAttributeSchema } from "./assignUserToAttribute.schema";
import { bulkAssignAttributesSchema } from "./bulkAssignAttributes.schema";
import { createAttributeSchema } from "./create.schema";
import { deleteAttributeSchema } from "./delete.schema";
import { editAttributeSchema } from "./edit.schema";
import { ZFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";
import { getAttributeSchema } from "./get.schema";
import { getByUserIdSchema } from "./getByUserId.schema";
import { toggleActiveSchema } from "./toggleActive.schema";

const NAMESPACE = "attributes";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;

export const attributesRouter = router({
  list: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  get: authedProcedure.input(getAttributeSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  getByUserId: authedProcedure.input(getByUserIdSchema).query(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("getByUserId"), () => import("./getByUserId.handler"));
    return handler({ ctx, input });
  }),
  // Mutations
  create: authedOrgAdminProcedure.input(createAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler({ ctx, input });
  }),
  edit: authedOrgAdminProcedure.input(editAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("edit"), () => import("./edit.handler"));
    return handler({ ctx, input });
  }),
  delete: authedOrgAdminProcedure.input(deleteAttributeSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler({ ctx, input });
  }),
  toggleActive: authedOrgAdminProcedure.input(toggleActiveSchema).mutation(async ({ ctx, input }) => {
    const handler = await importHandler(namespaced("toggleActive"), () => import("./toggleActive.handler"));
    return handler({ ctx, input });
  }),

  assignUserToAttribute: authedOrgAdminProcedure
    .input(assignUserToAttributeSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("assignUserToAttribute"),
        () => import("./assignUserToAttribute.handler")
      );
      return handler({ ctx, input });
    }),

  bulkAssignAttributes: authedOrgAdminProcedure
    .input(bulkAssignAttributesSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("bulkAssignAttributes"),
        () => import("./bulkAssignAttributes.handler")
      );
      return handler({ ctx, input });
    }),

  findTeamMembersMatchingAttributeLogic: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicInputSchema)
    .query(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("findTeamMembersMatchingAttributeLogic"),
        () => import("./findTeamMembersMatchingAttributeLogic.handler")
      );
      return handler({ ctx, input });
    }),
});
