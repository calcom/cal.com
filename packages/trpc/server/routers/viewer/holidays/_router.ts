import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetUserSettingsSchema } from "./getUserSettings.schema";
import { ZToggleHolidaySchema } from "./toggleHoliday.schema";
import { ZUpdateSettingsSchema } from "./updateSettings.schema";
import { ZCheckConflictsSchema } from "./checkConflicts.schema";

export const holidaysRouter = router({
  getSupportedCountries: authedProcedure.query(async () => {
    const { getSupportedCountriesHandler } = await import("./getSupportedCountries.handler");

    return getSupportedCountriesHandler();
  }),

  getUserSettings: authedProcedure.input(ZGetUserSettingsSchema).query(async ({ ctx, input }) => {
    const { getUserSettingsHandler } = await import("./getUserSettings.handler");

    return getUserSettingsHandler({ ctx, input });
  }),

  updateSettings: authedProcedure.input(ZUpdateSettingsSchema).mutation(async ({ ctx, input }) => {
    const { updateSettingsHandler } = await import("./updateSettings.handler");

    return updateSettingsHandler({ ctx, input });
  }),

  toggleHoliday: authedProcedure.input(ZToggleHolidaySchema).mutation(async ({ ctx, input }) => {
    const { toggleHolidayHandler } = await import("./toggleHoliday.handler");

    return toggleHolidayHandler({ ctx, input });
  }),

  checkConflicts: authedProcedure.input(ZCheckConflictsSchema).query(async ({ ctx, input }) => {
    const { checkConflictsHandler } = await import("./checkConflicts.handler");

    return checkConflictsHandler({ ctx, input });
  }),
});
