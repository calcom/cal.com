import { WEBAPP_URL } from "@calcom/lib/constants";

import { ProviderPermanentError } from "../../providers/types";
import type { CalendarProvider } from "../../providers/types";

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, "");

export const buildProviderWebhookUrl = (provider: CalendarProvider): string => {
  /* eslint-disable turbo/no-undeclared-env-vars */
  const baseUrl = WEBAPP_URL;
  /* eslint-enable turbo/no-undeclared-env-vars */

  if (!baseUrl || baseUrl.trim().length === 0) {
    throw new ProviderPermanentError({
      provider,
      message: "Missing webhook base URL configuration. Set CALENDAR_WEBHOOK_BASE_URL or WEBAPP_URL.",
    });
  }

  return `${normalizeBaseUrl(baseUrl)}/api/webhooks/calendar/${provider.toLowerCase()}`;
};
