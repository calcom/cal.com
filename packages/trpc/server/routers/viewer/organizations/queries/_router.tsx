import authedProcedure, {
  authedAdminProcedure,
  authedOrgAdminProcedure,
} from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAdminGet } from "./adminGet.schema";
import { ZGetMembersInput } from "./getMembers.schema";
import { ZGetOtherTeamInputSchema } from "./getOtherTeam.schema";
import { ZGetUserInput } from "./getUser.schema";
import { ZListMembersInputSchema } from "./listMembers.schema";
import { ZListOtherTeamMembersSchema } from "./listOtherTeamMembers.schema";

export const organizationsRouter = router({
  getOrganizationOnboarding: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getOrganizationOnboarding.handler");
    return handler(opts);
  }),

  listCurrent: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listCurrent.handler");
    return handler(opts);
  }),

  checkIfOrgNeedsUpgrade: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./checkIfOrgNeedsUpgrade.handler");
    return handler(opts);
  }),

  getMembers: authedProcedure.input(ZGetMembersInput).query(async (opts) => {
    const { default: handler } = await import("./getMembers.handler");
    return handler(opts);
  }),

  listMembers: authedProcedure.input(ZListMembersInputSchema).query(async (opts) => {
    const { default: handler } = await import("./listMembers.handler");
    return handler(opts);
  }),

  getBrand: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getBrand.handler");
    return handler(opts);
  }),

  getUser: authedProcedure.input(ZGetUserInput).query(async (opts) => {
    const { default: handler } = await import("./getUser.handler");
    return handler(opts);
  }),

  getTeams: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./getTeams.handler");
    return handler(opts);
  }),

  listOtherTeamMembers: authedOrgAdminProcedure.input(ZListOtherTeamMembersSchema).query(async (opts) => {
    const { default: handler } = await import("./listOtherTeamMembers.handler");
    return handler(opts);
  }),

  getOtherTeam: authedOrgAdminProcedure.input(ZGetOtherTeamInputSchema).query(async (opts) => {
    const { default: handler } = await import("./getOtherTeam.handler");
    return handler(opts);
  }),

  listOtherTeams: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./listOtherTeams.handler");
    return handler(opts);
  }),

  adminGetAll: authedAdminProcedure.query(async (opts) => {
    const { default: handler } = await import("./adminGetAll.handler");
    return handler(opts);
  }),

  adminGet: authedAdminProcedure.input(ZAdminGet).query(async (opts) => {
    const { default: handler } = await import("./adminGet.handler");
    return handler(opts);
  }),
});
