import { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import authedProcedure, {
  authedAdminProcedure,
  authedOrgAdminProcedure,
} from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";
import { ZAddBulkTeams } from "./addBulkTeams.schema";
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
import { ZSetPasswordSchema } from "./setPassword.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateUserInputSchema } from "./updateUser.schema";

const NAMESPACE = "organizations";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const viewerOrganizationsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler(opts);
  }),
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("update"), () => import("./update.handler"));
    return handler(opts);
  }),
  verifyCode: authedProcedure.input(ZVerifyCodeInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("verifyCode"), () => import("./verifyCode.handler"));
    return handler(opts);
  }),
  createTeams: authedProcedure.input(ZCreateTeamsSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("createTeams"), () => import("./createTeams.handler"));
    return handler(opts);
  }),
  listCurrent: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("listCurrent"), () => import("./list.handler"));
    return handler(opts);
  }),
  checkIfOrgNeedsUpgrade: authedProcedure.query(async (opts) => {
    const handler = await importHandler(
      namespaced("checkIfOrgNeedsUpgrade"),
      () => import("./checkIfOrgNeedsUpgrade.handler")
    );
    return handler(opts);
  }),
  publish: authedProcedure.mutation(async (opts) => {
    const handler = await importHandler(namespaced("publish"), () => import("./publish.handler"));
    return handler(opts);
  }),
  setPassword: authedProcedure.input(ZSetPasswordSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("setPassword"), () => import("./setPassword.handler"));
    return handler(opts);
  }),
  getMembers: authedProcedure.input(ZGetMembersInput).query(async (opts) => {
    const handler = await importHandler(namespaced("getMembers"), () => import("./getMembers.handler"));
    return handler(opts);
  }),
  adminGetAll: authedAdminProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("adminGetAll"), () => import("./adminGetAll.handler"));
    return handler(opts);
  }),
  adminVerify: authedAdminProcedure.input(ZAdminVerifyInput).mutation(async (opts) => {
    const handler = await importHandler(namespaced("adminVerify"), () => import("./adminVerify.handler"));
    return handler(opts);
  }),
  listMembers: authedProcedure.input(ZListMembersSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("listMembers"), () => import("./listMembers.handler"));
    return handler(opts);
  }),
  getBrand: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("getBrand"), () => import("./getBrand.handler"));
    return handler(opts);
  }),
  getUser: authedProcedure.input(ZGetUserInput).query(async (opts) => {
    const handler = await importHandler(namespaced("getUser"), () => import("./getUser.handler"));
    return handler(opts);
  }),
  updateUser: authedProcedure.input(ZUpdateUserInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("updateUser"), () => import("./updateUser.handler"));
    return handler(opts);
  }),
  getTeams: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("getTeams"), () => import("./getTeams.handler"));
    return handler(opts);
  }),
  bulkAddToTeams: authedProcedure.input(ZAddBulkTeams).mutation(async (opts) => {
    const handler = await importHandler(namespaced("addBulkTeams"), () => import("./addBulkTeams.handler"));
    return handler(opts);
  }),
  bulkDeleteUsers: authedProcedure.input(ZBulkUsersDelete).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("bulkDeleteUsers"),
      () => import("./bulkDeleteUsers.handler")
    );
    return handler(opts);
  }),
  listOtherTeamMembers: authedOrgAdminProcedure.input(ZListOtherTeamMembersSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("listOtherTeamMembers"),
      () => import("./listOtherTeamMembers.handler")
    );
    return handler(opts);
  }),
  getOtherTeam: authedOrgAdminProcedure.input(ZGetOtherTeamInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("getOtherTeam"), () => import("./getOtherTeam.handler"));
    return handler(opts);
  }),
  listOtherTeams: authedOrgAdminProcedure.query(async (opts) => {
    const handler = await importHandler(
      namespaced("listOtherTeams"),
      () => import("./listOtherTeams.handler")
    );
    return handler(opts);
  }),
  deleteTeam: authedOrgAdminProcedure.input(ZDeleteTeamInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("deleteTeam"), () => import("./deleteTeam.handler"));
    return handler(opts);
  }),
});
