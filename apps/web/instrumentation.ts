import * as Sentry from "@sentry/nextjs";

async function registerBullMqCronJobs() {
  const { setupWhatsappTemplateSync } = await import(
    "@calcom/whatsapp-business/lib/setupWhatsappTemplateSync"
  );

  await setupWhatsappTemplateSync();
}

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
  // await registerBullMqCronJobs();
}

export const onRequestError = Sentry.captureRequestError;
