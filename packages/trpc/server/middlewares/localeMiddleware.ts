import { tracer, context } from "@calcom/lib/server/otel-initializer";

import sessionMiddleware from "./sessionMiddleware";

const localeMiddleware = sessionMiddleware.unstable_pipe(async ({ ctx, next }) => {
  const serverSideTranslationsImportSpan = tracer.startSpan(
    "serverSideTranslationsImport",
    undefined,
    context.active()
  );
  const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
  serverSideTranslationsImportSpan.end();

  const { user } = ctx;

  const serverSideTranslationsSpan = tracer.startSpan("serverSideTranslations", undefined, context.active());
  const i18n = await serverSideTranslations(
    user?.locale && user?.locale !== ctx.locale ? user.locale : ctx.locale,
    ["common", "vital"]
  );

  serverSideTranslationsSpan.end();

  const locale = user?.locale || ctx.locale;

  return next({
    ctx: { locale, i18n, user: { ...user, locale } },
  });
});

export default localeMiddleware;
