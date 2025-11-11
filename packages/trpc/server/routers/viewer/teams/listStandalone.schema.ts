import { z } from "zod";

export const ZListStandaloneSchema = z.object({});

export type TListStandaloneSchema = z.infer<typeof ZListStandaloneSchema>;
