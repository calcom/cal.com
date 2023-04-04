import z from "zod";

import { authedAdminProcedure, authedProcedure, router } from "../../../trpc";
import { listLocalSchema } from "./schemas/listLocalSchema";
import { saveKeysSchema } from "./schemas/saveKeysSchema";
import { toggleSchema } from "./schemas/toggleSchema";
import { updateAppCredentialsSchema } from "./schemas/updateAppCredentialsSchema";

export const appsRouter = router({
  listLocal: authedAdminProcedure.input(listLocalSchema).query(async (opt) => {
    const { listLocal } = await import("./listLocal");
    return listLocal(opt);
  }),
  toggle: authedAdminProcedure.input(toggleSchema).mutation(async (opt) => {
    const { toggle } = await import("./toggle");
    return toggle(opt);
  }),
  saveKeys: authedAdminProcedure.input(saveKeysSchema).mutation(async (opt) => {
    const { saveKeys } = await import("./saveKeys");
    return saveKeys(opt);
  }),
  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    const gCalPresent = await ctx.prisma.credential.findFirst({
      where: {
        type: "google_calendar",
        userId: ctx.user.id,
      },
    });
    return !!gCalPresent;
  }),
  updateAppCredentials: authedProcedure.input(updateAppCredentialsSchema).mutation(async (opt) => {
    const { updateAppCredentials } = await import("./updateAppCredentials");
    return updateAppCredentials(opt);
  }),
  queryForDependencies: authedProcedure.input(z.string().array().optional()).query(async (opt) => {
    const { queryForDependencies } = await import("./queryForDependencies");
    return queryForDependencies(opt);
  }),
});
