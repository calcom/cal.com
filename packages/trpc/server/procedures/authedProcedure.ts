import { auditLogMiddleware } from "@calcom/features/audit-logs/lib/trpc-plugin";

import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { isAdminMiddleware, isAuthed, isOrgAdminMiddleware } from "../middlewares/sessionMiddleware";
import { procedure } from "../trpc";
import publicProcedure from "./publicProcedure";

/*interface IRateLimitOptions {
  intervalInMs: number;
  limit: number;
}
const isRateLimitedByUserIdMiddleware = ({ intervalInMs, limit }: IRateLimitOptions) =>
  middleware(({ ctx, next }) => {
      // validate user exists
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const { isRateLimited } = rateLimit({ intervalInMs }).check(limit, ctx.user.id.toString());

      if (isRateLimited) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      }

      return next({ ctx: { user: ctx.user, session: ctx.session } });
    });
*/
const authedProcedure = procedure.use(captureErrorsMiddleware).use(perfMiddleware).use(isAuthed);
/*export const authedRateLimitedProcedure = ({ intervalInMs, limit }: IRateLimitOptions) =>
authedProcedure.use(isRateLimitedByUserIdMiddleware({ intervalInMs, limit }));*/
export const authedAdminProcedure = publicProcedure.use(captureErrorsMiddleware).use(isAdminMiddleware);
export const authedAdminProcedureWithAuditLogger = publicProcedure
  .use(captureErrorsMiddleware)
  .use(isAdminMiddleware)
  .use(auditLogMiddleware);
export const authedOrgAdminProcedure = publicProcedure.use(captureErrorsMiddleware).use(isOrgAdminMiddleware);

export default authedProcedure;
