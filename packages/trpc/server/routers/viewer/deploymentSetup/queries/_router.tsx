import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZValidateLicenseInputSchema } from "./validateLicense.schema";

export const deploymentSetupQueriesRouter = router({
  validateLicense: authedAdminProcedure.input(ZValidateLicenseInputSchema).query(async ({ input, ctx }) => {
    const { validateLicenseHandler } = await import("./validateLicense.handler");

    return validateLicenseHandler({
      ctx,
      input,
    });
  }),
});
