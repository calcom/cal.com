import { z } from "zod";

export const ZInvoicesSchema = z.object({});

export type TInvoicesSchema = z.infer<typeof ZInvoicesSchema>;
