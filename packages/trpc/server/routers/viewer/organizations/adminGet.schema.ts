import { z } from "zod";

export const ZAdminGet = z.object({
  id: z.number(),
});

export type TAdminGet = z.infer<typeof ZAdminGet>;
