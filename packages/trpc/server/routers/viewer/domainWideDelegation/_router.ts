import { authedOrgAdminProcedure } from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import {
  DomainWideDelegationCreateSchema,
  DomainWideDelegationUpdateSchema,
  DomainWideDelegationDeleteSchema,
} from "./domainWideDelegation.schema";

const NAMESPACE = "domainWideDelegation";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const domainWideDelegationRouter = router({
  list: authedOrgAdminProcedure.query(async (opts) => {
    const handler = await importHandler(
      namespaced("listDomainWideDelegationsHandler"),
      () => import("./domainWideDelegation.handler"),
      "listDomainWideDelegationsHandler"
    );
    return handler(opts);
  }),
  update: authedOrgAdminProcedure.input(DomainWideDelegationUpdateSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("updateDomainWideDelegationHandler"),
      () => import("./domainWideDelegation.handler"),
      "updateDomainWideDelegationHandler"
    );
    return handler(opts);
  }),
  add: authedOrgAdminProcedure.input(DomainWideDelegationCreateSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("createDomainWideDelegationHandler"),
      () => import("./domainWideDelegation.handler"),
      "createDomainWideDelegationHandler"
    );
    return handler(opts);
  }),
  delete: authedOrgAdminProcedure.input(DomainWideDelegationDeleteSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("deleteDomainWideDelegationHandler"),
      () => import("./domainWideDelegation.handler"),
      "deleteDomainWideDelegationHandler"
    );
    return handler(opts);
  }),
});
