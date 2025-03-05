import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import authedProcedure, { authedOrgAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import {
  DomainWideDelegationCreateSchema,
  DomainWideDelegationUpdateSchema,
  DomainWideDelegationDeleteSchema,
  DomainWideDelegationToggleEnabledSchema,
} from "./schema";

const NAMESPACE = "domainWideDelegation";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

const checkDomainWideDelegationFeature = async ({
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

  const hasDomainWideDelegation = await featureRepo.checkIfTeamHasFeature(
    user.organizationId,
    "domain-wide-delegation"
  );
  if (!hasDomainWideDelegation) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: t("domain_wide_delegation_feature_not_enabled"),
    });
  }
  return next();
};

export const domainWideDelegationRouter = router({
  list: authedOrgAdminProcedure.use(checkDomainWideDelegationFeature).query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  update: authedOrgAdminProcedure
    .use(checkDomainWideDelegationFeature)
    .input(DomainWideDelegationUpdateSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
      return handler(opts);
    }),
  add: authedOrgAdminProcedure
    .use(checkDomainWideDelegationFeature)
    .input(DomainWideDelegationCreateSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("add"), () => import("./add.handler"));
      return handler(opts);
    }),
  toggleEnabled: authedOrgAdminProcedure
    .use(checkDomainWideDelegationFeature)
    .input(DomainWideDelegationToggleEnabledSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("toggleEnabled"),
        () => import("./toggleEnabled.handler")
      );
      return handler(opts);
    }),
  delete: authedOrgAdminProcedure
    .use(checkDomainWideDelegationFeature)
    .input(DomainWideDelegationDeleteSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
      return handler(opts);
    }),
  listWorkspacePlatforms: authedProcedure.use(checkDomainWideDelegationFeature).query(async () => {
    const handler = await importHandler(
      namespaced("listWorkspacePlatforms"),
      () => import("./listWorkspacePlatforms.handler")
    );
    return handler();
  }),
});
