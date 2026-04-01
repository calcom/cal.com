import { z } from "zod";

export const ZUpsertDunningSchema = z.object({
  billingId: z.string(),
  entityType: z.enum(["team", "organization"]),
  status: z.enum(["CURRENT", "WARNING", "SOFT_BLOCKED", "HARD_BLOCKED", "CANCELLED"]),
  invoiceUrl: z
    .string()
    .refine((val) => val === "" || val.startsWith("https://") || val.startsWith("http://") || val.startsWith("mailto:"), {
      message: "Must be a valid URL (https://) or mailto: link",
    })
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .optional(),
});

export type TUpsertDunningInput = z.infer<typeof ZUpsertDunningSchema>;
