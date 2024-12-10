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

export const domainWideDelegationRouter = router({
  list: authedOrgAdminProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("list"), () => import("./list.handler"));
    return handler(opts);
  }),
  update: authedOrgAdminProcedure.input(DomainWideDelegationUpdateSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
    return handler(opts);
  }),
  add: authedOrgAdminProcedure.input(DomainWideDelegationCreateSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("add"), () => import("./add.handler"));
    return handler(opts);
  }),
  toggleEnabled: authedOrgAdminProcedure
    .input(DomainWideDelegationToggleEnabledSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("toggleEnabled"),
        () => import("./toggleEnabled.handler")
      );
      return handler(opts);
    }),
  delete: authedOrgAdminProcedure.input(DomainWideDelegationDeleteSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler(opts);
  }),
  listWorkspacePlatforms: authedProcedure.query(async () => {
    const handler = await importHandler(
      namespaced("listWorkspacePlatforms"),
      () => import("./listWorkspacePlatforms.handler")
    );
    return handler();
  }),
});
