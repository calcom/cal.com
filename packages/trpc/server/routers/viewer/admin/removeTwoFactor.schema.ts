import { z } from "zod";

export const ZAdminRemoveTwoFactor = z.object({
  userId: z.number(),
});

export type TAdminRemoveTwoFactor = z.infer<typeof ZAdminRemoveTwoFactor>;
