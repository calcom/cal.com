import type { IncomingMessage } from "http";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["lib", "getMainDomainOrgRedirect"] });
export const getMainDomainOrgRedirect = (req: IncomingMessage | undefined) => {
  if (!req) {
    return null;
  }

  const protocol = WEBAPP_URL.startsWith("https://") ? "https" : "http";
  const originalUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

  const domains = originalUrl.hostname.split(".");

  if (domains.length <= 2) {
    return null;
  }
  log.debug(`Looking for redirect from`, originalUrl.toString());

  const newHostName = `${domains[0]}.${domains.at(-1)}`;
  originalUrl.hostname = newHostName;

  return {
    redirect: {
      permanent: true,
      destination: originalUrl.toString(),
    },
  } as const;
};
