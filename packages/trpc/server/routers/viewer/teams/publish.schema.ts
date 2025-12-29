import { z } from "zod";

export type TPublishInputRawSchema = {
  teamId: string | number;
};

export type TPublishInputSchema = {
  teamId: number;
};

export const ZPublishInputSchema = z.object({
  teamId: z.coerce.number(),
});
