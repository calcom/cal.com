import { z } from "zod";

export const ZTransferOwnershipSchema = z
  .object({
    teamId: z.number(),
    newOwnerUserId: z.number(),
    previousOwnerUserId: z.number(),
    previousOwnerAction: z.enum(["ADMIN", "MEMBER", "REMOVE"]),
    customerId: z.string().refine((val) => val.startsWith("cus_"), {
      message: "Customer ID must start with 'cus_'",
    }),
    mode: z.enum(["preview", "execute"]),
  })
  .refine((data) => data.newOwnerUserId !== data.previousOwnerUserId, {
    message: "New owner and previous owner must be different users",
    path: ["newOwnerUserId"],
  });

export type TTransferOwnershipInput = z.infer<typeof ZTransferOwnershipSchema>;
