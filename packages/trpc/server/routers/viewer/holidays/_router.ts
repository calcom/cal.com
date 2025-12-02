import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetUserSettingsSchema } from "./getUserSettings.schema";
import { ZToggleHolidaySchema } from "./toggleHoliday.schema";
import { ZUpdateSettingsSchema } from "./updateSettings.schema";
import { ZCheckConflictsSchema } from "./checkConflicts.schema";

export const holidaysRouter = router({
  getSupportedCountries: authedProcedure.query(async () => {
    const handler = (await import("./getSupportedCountries.handler")).getSupportedCountriesHandler;
    return handler();
  }),

  getUserSettings: authedProcedure.input(ZGetUserSettingsSchema).query(async ({ ctx, input }) => {
    const handler = (await import("./getUserSettings.handler")).getUserSettingsHandler;
    return handler({ ctx, input });
  }),

  updateSettings: authedProcedure.input(ZUpdateSettingsSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./updateSettings.handler")).updateSettingsHandler;
    return handler({ ctx, input });
  }),

  toggleHoliday: authedProcedure.input(ZToggleHolidaySchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./toggleHoliday.handler")).toggleHolidayHandler;
    return handler({ ctx, input });
  }),

  checkConflicts: authedProcedure.input(ZCheckConflictsSchema).query(async ({ ctx, input }) => {
    const handler = (await import("./checkConflicts.handler")).checkConflictsHandler;
    return handler({ ctx, input });
  }),
});

