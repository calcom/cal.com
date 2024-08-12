import type { IncomingMessage } from "http";

import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["lib", "getMainDomainOrgRedirect"] });
export const getMainDomainOrgRedirect = (
  req: IncomingMessage | undefined,
  subTeamSlugs: string[],
  targetHostName: string
) => {
  if (!req) {
    return null;
  }

  const protocol = WEBAPP_URL.startsWith("https://") ? "https" : "http";
  const originalUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

  if (originalUrl.hostname === targetHostName || targetHostName === "") {
    return null;
  }

  const subTeam = originalUrl.pathname.split("/").find((part) => !!part);

  if (
    originalUrl.pathname === "/" ||
    subTeamSlugs.length === 0 ||
    (subTeam && subTeamSlugs.includes(subTeam))
  ) {
    log.debug(`Looking for redirect from`, originalUrl.toString());
    originalUrl.hostname = targetHostName;
    const domain = targetHostName.split(".")[0];
    originalUrl.searchParams.append("redirectDomainSlug", domain);
    log.debug(`Suggesting redirect to`, originalUrl.toString());

    return {
      redirect: {
        permanent: true,
        destination: originalUrl.toString(),
      },
    } as const;
  } else {
    return null;
  }
};
