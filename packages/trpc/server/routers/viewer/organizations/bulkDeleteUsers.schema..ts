import { z } from "zod";

export const ZBulkUsersDelete = z.object({
  userIds: z.array(z.number()),
});

export type TBulkUsersDelete = z.infer<typeof ZBulkUsersDelete>;
