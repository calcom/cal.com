import * as z from "zod";
import * as imports from "../zod-utils";

export const _VerificationRequestModel = z.object({
  id: z.number().int(),
  identifier: z.string(),
  token: z.string(),
  expires: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
