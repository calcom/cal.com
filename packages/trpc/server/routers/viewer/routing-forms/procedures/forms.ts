import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";

import { importHandler } from "../../../../trpc";
import { ZFormsInputSchema } from "../forms.schema";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const forms = authedProcedure.input(ZFormsInputSchema).query(async ({ ctx, input }) => {
  const handler = await importHandler(namespaced("forms"), () => import("../forms.handler"));
  return handler({ ctx, input });
});
