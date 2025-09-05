import authedProcedure from "../../../../procedures/authedProcedure";
import { ZFormsInputSchema } from "./forms.schema";

export const forms = authedProcedure.input(ZFormsInputSchema).query(async ({ ctx, input }) => {
  const handler = (await import("./forms.handler")).default;
  return handler({ ctx, input });
});
