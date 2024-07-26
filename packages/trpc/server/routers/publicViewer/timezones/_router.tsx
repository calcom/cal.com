import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler, router } from "../../../trpc";
import { cityTimezonesSchema } from "./cityTimezones.schema";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

// things that unauthenticated users can query about themselves
export const timezonesRouter = router({
  cityTimezones: publicProcedure.input(cityTimezonesSchema).query(async () => {
    const handler = await importHandler(
      namespaced("cityTimezones"),
      () => import("@calcom/lib/cityTimezonesHandler")
    );
    return handler();
  }),
});
