import { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import { AIPhoneSettingSchema } from "@calcom/prisma/zod-utils";

import { isOrganizationFeatureEnabled } from "../../../middlewares/featureFlagMiddleware";
import authedProcedure, {
  authedAdminProcedure,
  authedOrgAdminProcedure,
} from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
import { ZAddMembersToTeams } from "./addMembersToTeams.schema";
import { ZAdminDeleteInput } from "./adminDelete.schema";
import { ZAdminGet } from "./adminGet.schema";
import { ZAdminUpdate } from "./adminUpdate.schema";
import { ZAdminVerifyInput } from "./adminVerify.schema";
import { ZBulkUsersDelete } from "./bulkDeleteUsers.schema.";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateTeamsSchema } from "./createTeams.schema";
import { ZDeleteTeamInputSchema } from "./deleteTeam.schema";
import { ZGetMembersInput } from "./getMembers.schema";
import { ZGetOtherTeamInputSchema } from "./getOtherTeam.handler";
import { ZGetUserInput } from "./getUser.schema";
import { ZListMembersSchema } from "./listMembers.schema";
import { ZListOtherTeamMembersSchema } from "./listOtherTeamMembers.handler";
import { ZRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
import { ZSetPasswordSchema } from "./setPassword.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateUserInputSchema } from "./updateUser.schema";

const NAMESPACE = "organizations";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerOrganizationsRouter = router({
  create: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZCreateInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
      return handler(opts);
    }),
  update: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZUpdateInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
      return handler(opts);
    }),
  verifyCode: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZVerifyCodeInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("verifyCode"), () => import("./verifyCode.handler"));
      return handler(opts);
    }),
  createTeams: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZCreateTeamsSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("createTeams"), () => import("./createTeams.handler"));
      return handler(opts);
    }),
  listCurrent: authedProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(namespaced("listCurrent"), () => import("./list.handler"));
    return handler(opts);
  }),
  checkIfOrgNeedsUpgrade: authedProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(
      namespaced("checkIfOrgNeedsUpgrade"),
      () => import("./checkIfOrgNeedsUpgrade.handler")
    );
    return handler(opts);
  }),
  publish: authedProcedure.use(isOrganizationFeatureEnabled).mutation(async (opts) => {
    const handler = await importHandler(namespaced("publish"), () => import("./publish.handler"));
    return handler(opts);
  }),
  setPassword: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZSetPasswordSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("setPassword"), () => import("./setPassword.handler"));
      return handler(opts);
    }),
  getMembers: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZGetMembersInput)
    .query(async (opts) => {
      const handler = await importHandler(namespaced("getMembers"), () => import("./getMembers.handler"));
      return handler(opts);
    }),
  listMembers: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZListMembersSchema)
    .query(async (opts) => {
      const handler = await importHandler(namespaced("listMembers"), () => import("./listMembers.handler"));
      return handler(opts);
    }),
  getBrand: authedProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(namespaced("getBrand"), () => import("./getBrand.handler"));
    return handler(opts);
  }),
  getUser: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZGetUserInput)
    .query(async (opts) => {
      const handler = await importHandler(namespaced("getUser"), () => import("./getUser.handler"));
      return handler(opts);
    }),
  updateUser: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZUpdateUserInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("updateUser"), () => import("./updateUser.handler"));
      return handler(opts);
    }),
  getTeams: authedProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(namespaced("getTeams"), () => import("./getTeams.handler"));
    return handler(opts);
  }),
  addMembersToTeams: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAddMembersToTeams)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("addMembersToTeams"),
        () => import("./addMembersToTeams.handler")
      );
      return handler(opts);
    }),
  addMembersToEventTypes: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAddMembersToEventTypes)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("addMembersToEventTypes"),
        () => import("./addMembersToEventTypes.handler")
      );
      return handler(opts);
    }),
  removeHostsFromEventTypes: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZRemoveHostsFromEventTypes)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("removeHostsFromEventTypes"),
        () => import("./removeHostsFromEventTypes.handler")
      );
      return handler(opts);
    }),
  bulkDeleteUsers: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZBulkUsersDelete)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("bulkDeleteUsers"),
        () => import("./bulkDeleteUsers.handler")
      );
      return handler(opts);
    }),
  listOtherTeamMembers: authedOrgAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZListOtherTeamMembersSchema)
    .query(async (opts) => {
      const handler = await importHandler(
        namespaced("listOtherTeamMembers"),
        () => import("./listOtherTeamMembers.handler")
      );
      return handler(opts);
    }),
  getOtherTeam: authedOrgAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZGetOtherTeamInputSchema)
    .query(async (opts) => {
      const handler = await importHandler(namespaced("getOtherTeam"), () => import("./getOtherTeam.handler"));
      return handler(opts);
    }),
  listOtherTeams: authedProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(
      namespaced("listOtherTeams"),
      () => import("./listOtherTeams.handler")
    );
    return handler(opts);
  }),
  deleteTeam: authedOrgAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZDeleteTeamInputSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("deleteTeam"), () => import("./deleteTeam.handler"));
      return handler(opts);
    }),

  adminGetAll: authedAdminProcedure.use(isOrganizationFeatureEnabled).query(async (opts) => {
    const handler = await importHandler(namespaced("adminGetAll"), () => import("./adminGetAll.handler"));
    return handler(opts);
  }),
  adminGet: authedAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAdminGet)
    .query(async (opts) => {
      const handler = await importHandler(namespaced("adminGet"), () => import("./adminGet.handler"));
      return handler(opts);
    }),
  adminUpdate: authedAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAdminUpdate)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("adminUpdate"), () => import("./adminUpdate.handler"));
      return handler(opts);
    }),
  adminVerify: authedAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAdminVerifyInput)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("adminVerify"), () => import("./adminVerify.handler"));
      return handler(opts);
    }),
  adminDelete: authedAdminProcedure
    .use(isOrganizationFeatureEnabled)
    .input(ZAdminDeleteInput)
    .mutation(async (opts) => {
      const handler = await importHandler(namespaced("adminDelete"), () => import("./adminDelete.handler"));
      return handler(opts);
    }),
  createPhoneCall: authedProcedure
    .use(isOrganizationFeatureEnabled)
    .input(AIPhoneSettingSchema)
    .mutation(async (opts) => {
      const handler = await importHandler(
        namespaced("createPhoneCall"),
        () => import("./createPhoneCall.handler")
      );
      return handler(opts);
    }),
});
