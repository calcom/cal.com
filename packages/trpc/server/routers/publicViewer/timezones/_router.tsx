import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { cityTimezonesSchema } from "./cityTimezones.schema";

// things that unauthenticated users can query about themselves
export const timezonesRouter = router({
  cityTimezones: publicProcedure.input(cityTimezonesSchema).query(async () => {
    const { cityTimezonesHandler: handler } = await import(
      "@calcom/features/cityTimezones/cityTimezonesHandler"
    );
    return handler();
  }),
});
