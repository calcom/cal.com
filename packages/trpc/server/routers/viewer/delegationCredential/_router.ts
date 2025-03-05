import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import authedProcedure, { authedOrgAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import {
  DelegationCredentialCreateSchema,
  DelegationCredentialUpdateSchema,
  DelegationCredentialDeleteSchema,
  DelegationCredentialToggleEnabledSchema,
} from "./schema";

const NAMESPACE = "delegationCredential";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

const checkDelegationCredentialFeature = async ({
  ctx,
  next,
}: {
  ctx: { user: { id: number; locale?: string; organizationId: number | null } };
  next: () => Promise<any>;
}) => {
  const user = ctx.user;
  const t = await getTranslation(user.locale ?? "en", "common");
  const featureRepo = new FeaturesRepository();

  if (!user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: t("no_organization_found"),
    });
  }

  const hasDelegationCredential = await featureRepo.checkIfTeamHasFeature(
    user.organizationId,
    "delegation-credential"
  );
  if (!hasDelegationCredential) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: t("delegation_credential_feature_not_enabled"),
    });
  }
  return next();
};

export const delegationCredentialRouter = router({
  list: authedOrgAdminProcedure.use(checkDelegationCredentialFeature).query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  update: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialUpdateSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
      return handler(opts);
    }),
  add: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialCreateSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("add"), () => import("./add.handler"));
      return handler(opts);
    }),
  toggleEnabled: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialToggleEnabledSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("toggleEnabled"),
        () => import("./toggleEnabled.handler")
      );
      return handler(opts);
    }),
  delete: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialDeleteSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
      return handler(opts);
    }),
  listWorkspacePlatforms: authedProcedure.use(checkDelegationCredentialFeature).query(async () => {
    const handler = await importHandler(
      namespaced("listWorkspacePlatforms"),
      () => import("./listWorkspacePlatforms.handler")
    );
    return handler();
  }),
});
