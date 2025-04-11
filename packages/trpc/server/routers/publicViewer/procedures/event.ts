import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";

import { getUserSession } from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";
import { ZEventInputSchema } from "../event.schema";

export const event = publicProcedure.input(ZEventInputSchema).query(async (opts) => {
  const { user } = await getUserSession(opts.ctx);
  return await getPublicEvent({ ...opts.input, currentUserId: user?.id, prisma: opts.ctx.prisma });
});
