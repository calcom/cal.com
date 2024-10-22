import { z } from "zod";

const expandableColumns = z.enum(["attributes"]);

export const ZListMembersSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().optional(),
  expand: z.array(expandableColumns).optional(),
  filters: z
    .array(
      z.object({
        id: z.string(),
        value: z.array(z.string()),
      })
    )
    .optional(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
