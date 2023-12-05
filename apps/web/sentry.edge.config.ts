import * as Sentry from "@sentry/nextjs";
import { AppConfig } from "app-config";

Sentry.init({
  dsn: AppConfig.env.NEXT_PUBLIC_SENTRY_DSN,
});
