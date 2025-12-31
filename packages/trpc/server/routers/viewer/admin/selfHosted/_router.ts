import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import {
  ZListDeploymentsInputSchema,
  ZGetDeploymentKeysInputSchema,
  ZGetDeploymentUsageInputSchema,
  ZGetKeyUsageInputSchema,
  ZRegenerateSignatureInputSchema,
} from "./schema";

export const selfHostedRouter = router({
  listDeployments: authedAdminProcedure
    .input(ZListDeploymentsInputSchema)
    .query(async (opts) => {
      const { listDeploymentsHandler: handler } = await import(
        "./listDeployments.handler"
      );
      return handler(opts);
    }),
  getDeploymentKeys: authedAdminProcedure
    .input(ZGetDeploymentKeysInputSchema)
    .query(async (opts) => {
      const { getDeploymentKeysHandler: handler } = await import(
        "./getDeploymentKeys.handler"
      );
      return handler(opts);
    }),
  getDeploymentUsage: authedAdminProcedure
    .input(ZGetDeploymentUsageInputSchema)
    .query(async (opts) => {
      const { getDeploymentUsageHandler: handler } = await import(
        "./getDeploymentUsage.handler"
      );
      return handler(opts);
    }),
  getKeyUsage: authedAdminProcedure
    .input(ZGetKeyUsageInputSchema)
    .query(async (opts) => {
      const { getKeyUsageHandler: handler } = await import(
        "./getKeyUsage.handler"
      );
      return handler(opts);
    }),
  regenerateSignature: authedAdminProcedure
    .input(ZRegenerateSignatureInputSchema)
    .mutation(async (opts) => {
      const { regenerateSignatureHandler: handler } = await import(
        "./regenerateSignature.handler"
      );
      return handler(opts);
    }),
});
