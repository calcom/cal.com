import * as z from "zod";

export const _ResetPasswordRequestModel = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  email: z.string(),
  expires: z.date(),
});
