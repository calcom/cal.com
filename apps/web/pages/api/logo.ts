import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { IS_SELF_HOSTED, LOGO, LOGO_ICON, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getChildLogger({ prefix: ["[api/logo]"] });

function removePort(url: string) {
  return url.replace(/:\d+$/, "");
}

function extractSubdomainAndDomain(hostname: string) {
  const hostParts = removePort(hostname).split(".");

  const subdomainParts = hostParts.slice(0, hostParts.length - 2);
  const domain = hostParts.slice(hostParts.length - 2).join(".");

  return [subdomainParts[0], domain];
}

const logoApiSchema = z.object({
  icon: z.coerce.boolean().optional(),
});

const SYSTEM_SUBDOMAINS = ["console", "app", "www"];

async function getTeamLogos(subdomain: string) {
  try {
    if (
      // if not cal.com
      IS_SELF_HOSTED ||
      // missing subdomain (empty string)
      !subdomain ||
      // in SYSTEM_SUBDOMAINS list
      SYSTEM_SUBDOMAINS.includes(subdomain)
    ) {
      throw new Error("No custom logo needed");
    }
    // load from DB
    const { default: prisma } = await import("@calcom/prisma");
    const team = await prisma.team.findUniqueOrThrow({
      where: {
        slug: subdomain,
      },
      select: {
        appLogo: true,
        appIconLogo: true,
      },
    });
    // try to use team logos, otherwise default to LOGO/LOGO_ICON regardless
    return {
      appLogo: team.appLogo || `${WEBAPP_URL}${LOGO}`,
      appIconLogo: team.appIconLogo || `${WEBAPP_URL}${LOGO_ICON}`,
    };
  } catch (error) {
    if (error instanceof Error) log.debug(error.message);
    return {
      appLogo: `${WEBAPP_URL}${LOGO}`,
      appIconLogo: `${WEBAPP_URL}${LOGO_ICON}`,
    };
  }
}

/**
 * This API endpoint is used to serve the logo associated with a team if no logo is found we serve our default logo
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const parsedQuery = logoApiSchema.parse(query);

  const hostname = req?.headers["host"];
  if (!hostname) throw new Error("No hostname");
  const domains = extractSubdomainAndDomain(hostname);
  if (!domains) throw new Error("No domains");

  const [subdomain] = domains;
  const { appLogo, appIconLogo } = await getTeamLogos(subdomain);

  const filteredLogo = parsedQuery?.icon ? appIconLogo : appLogo;

  try {
    const response = await fetch(filteredLogo);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", response.headers.get("content-type") as string);
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(buffer);
  } catch (error) {
    res.statusCode = 404;
    res.json({ error: "Failed fetching logo" });
  }
}
