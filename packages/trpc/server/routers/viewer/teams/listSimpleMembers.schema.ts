import { z } from "zod";

export const ZListSimpleMembersInputSchema = z.object({});

export type TListSimpleMembersInputSchema = z.infer<typeof ZListSimpleMembersInputSchema>;
