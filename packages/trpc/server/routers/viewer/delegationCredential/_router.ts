import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure, { authedOrgAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import {
  DelegationCredentialCreateSchema,
  DelegationCredentialUpdateSchema,
  DelegationCredentialDeleteSchema,
  DelegationCredentialToggleEnabledSchema,
  DelegationCredentialGetAffectedMembersForDisableSchema,
} from "./schema";

const checkDelegationCredentialFeature = async ({
  ctx,
  next,
}: {
  ctx: { user: { id: number; locale?: string; organizationId: number | null } };
  next: () => Promise<any>;
}) => {
  const user = ctx.user;
  const t = await getTranslation(user.locale ?? "en", "common");
  const featureRepo = new FeaturesRepository(prisma);

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
  check: authedOrgAdminProcedure.query(async (opts) => {
    return await checkDelegationCredentialFeature({
      ctx: opts.ctx,
      next: async () => ({
        hasDelegationCredential: true,
      }),
    });
  }),
  list: authedOrgAdminProcedure.use(checkDelegationCredentialFeature).query(async (opts) => {
    const handler = await import("./list.handler").then((mod) => mod.default);
    return handler(opts);
  }),
  update: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialUpdateSchema)
    .mutation(async (opts) => {
      const handler = await import("./update.handler").then((mod) => mod.default);
      return handler(opts);
    }),
  add: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialCreateSchema)
    .mutation(async (opts) => {
      const handler = await import("./add.handler").then((mod) => mod.default);
      return handler(opts);
    }),
  toggleEnabled: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialToggleEnabledSchema)
    .mutation(async (opts) => {
      const handler = await import("./toggleEnabled.handler").then((mod) => mod.default);
      return handler(opts);
    }),
  getAffectedMembersForDisable: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialGetAffectedMembersForDisableSchema)
    .query(async (opts) => {
      const handler = await import("./getAffectedMembersForDisable.handler").then((mod) => mod.default);
      return handler(opts);
    }),
  delete: authedOrgAdminProcedure
    .use(checkDelegationCredentialFeature)
    .input(DelegationCredentialDeleteSchema)
    .mutation(async (opts) => {
      const handler = await import("./delete.handler").then((mod) => mod.default);
      return handler(opts);
    }),
  listWorkspacePlatforms: authedProcedure.use(checkDelegationCredentialFeature).query(async () => {
    const handler = await import("./listWorkspacePlatforms.handler").then((mod) => mod.default);
    return handler();
  }),
});
