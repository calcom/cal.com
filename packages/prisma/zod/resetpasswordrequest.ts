import * as z from "zod";
import * as imports from "../zod-utils";

export const _ResetPasswordRequestModel = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  email: z.string(),
  expires: z.date(),
});
