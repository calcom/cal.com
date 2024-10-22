import { isAuthed } from "./sessionMiddleware";

export const lastActivityCache = new Map<number, Date>();
let lastUpdatedTime: number | null = null;
const UPDATE_DB_INTERVAL = 60 * 60 * 1000; // 1 hour

const updateLastActivityMiddleware = isAuthed.unstable_pipe(async ({ ctx, next }) => {
  const { user, session } = ctx;

  if (user.id) {
    lastActivityCache.set(user.id, new Date());
  }

  const currentTime = new Date().getTime();
  // We update in the DB initially and then after every 1 hour as defined by UPDATE_DB_INTERVAL because updating the DB everytime
  // the middleware is called will become too expensive.
  if (
    (!lastUpdatedTime || currentTime - lastUpdatedTime > UPDATE_DB_INTERVAL) &&
    lastActivityCache.size > 0
  ) {
    const updatePromises = Array.from(lastActivityCache.entries()).map(([userId, lastActivityAt]) =>
      ctx.prisma.user.update({
        where: { id: userId },
        data: { lastActivityAt },
      })
    );

    try {
      await Promise.all(updatePromises);
      lastUpdatedTime = currentTime;
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  }

  return next({ ctx: { user, session } });
});

export default updateLastActivityMiddleware;
