import sessionMiddleware from "./sessionMiddleware";

const localeMiddleware = sessionMiddleware.unstable_pipe(async ({ ctx, next }) => {
  const { user } = ctx;

  const locale = user?.locale || ctx.locale;

  return next({
    ctx: { locale, user: { ...user, locale } },
  });
});

export default localeMiddleware;
