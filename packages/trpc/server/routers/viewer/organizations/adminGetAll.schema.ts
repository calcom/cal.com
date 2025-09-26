import { z } from "zod";

export const ZAdminGetAllInput = z.object({
  take: z.number().min(1).max(250).default(25),
  skip: z.number().min(0).default(0),
  orderBy: z.enum(["createdAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type TAdminGetAllInput = z.infer<typeof ZAdminGetAllInput>;
