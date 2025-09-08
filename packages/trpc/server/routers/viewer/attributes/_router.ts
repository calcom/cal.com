import type { z } from "zod";

import { mergeRouters, router } from "../../../trpc";
import { attributesMutationsRouter } from "./mutations/_router";
import { attributesQueriesRouter } from "./queries/_router";
import type { ZFindTeamMembersMatchingAttributeLogicInputSchema } from "./queries/findTeamMembersMatchingAttributeLogic.schema";

export type TFindTeamMembersMatchingAttributeLogicInputSchema = z.infer<
  typeof ZFindTeamMembersMatchingAttributeLogicInputSchema
>;

export const attributesRouter = mergeRouters(
  router({
    queries: attributesQueriesRouter,
    mutations: attributesMutationsRouter,
  })
);
