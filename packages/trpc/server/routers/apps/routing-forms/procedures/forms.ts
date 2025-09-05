import { ZFormsInputSchema } from "@calcom/app-store/routing-forms/trpc/forms.schema";

import authedProcedure from "../../../../procedures/authedProcedure";

export const forms = authedProcedure.input(ZFormsInputSchema).query(async ({ ctx, input }) => {
  const handler = (await import("@calcom/app-store/routing-forms/trpc/forms.handler")).default;
  return handler({ ctx, input });
});
