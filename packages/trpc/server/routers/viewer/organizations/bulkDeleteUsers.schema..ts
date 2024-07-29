import { z } from "zod";

export const ZBulkUsersDelete = z.object({
  userIds: z.array(z.number()),
  redirectToUserId: z.number().optional(),
});

export type TBulkUsersDelete = z.infer<typeof ZBulkUsersDelete>;
