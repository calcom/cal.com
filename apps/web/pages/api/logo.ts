import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import {
  ANDROID_CHROME_ICON_192,
  ANDROID_CHROME_ICON_256,
  APPLE_TOUCH_ICON,
  FAVICON_16,
  FAVICON_32,
  IS_SELF_HOSTED,
  LOGO,
  LOGO_ICON,
  MSTILE_ICON,
  WEBAPP_URL,
} from "@calcom/lib/constants";

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
  type: z.coerce.string().optional(),
});

const SYSTEM_SUBDOMAINS = ["console", "app", "www"];

async function getTeamLogos(subdomain: string) {
  if (
    // if not cal.com
    IS_SELF_HOSTED ||
    // missing subdomain (empty string)
    !subdomain ||
    // in SYSTEM_SUBDOMAINS list
    SYSTEM_SUBDOMAINS.includes(subdomain)
  ) {
    return {
      appLogo: `${WEBAPP_URL}${LOGO}`,
      appIconLogo: `${WEBAPP_URL}${LOGO_ICON}`,
    };
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

  return {
    appLogo: team.appLogo,
    appIconLogo: team.appIconLogo,
  };
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

  // Resolve all icon types to team logos, falling back to Cal.com defaults.
  let filteredLogo;
  switch (parsedQuery?.type) {
    case "icon":
      filteredLogo = appIconLogo || `${WEBAPP_URL}${LOGO_ICON}`;
      break;

    case "favicon-16":
      filteredLogo = appIconLogo || `${WEBAPP_URL}${FAVICON_16}`;
      break;

    case "favicon-32":
      filteredLogo = appIconLogo || `${WEBAPP_URL}${FAVICON_32}`;
      break;

    case "apple-touch-icon":
      filteredLogo = appLogo || `${WEBAPP_URL}${APPLE_TOUCH_ICON}`;
      break;

    case "mstile":
      filteredLogo = appLogo || `${WEBAPP_URL}${MSTILE_ICON}`;
      break;

    case "android-chrome-192":
      filteredLogo = appLogo || `${WEBAPP_URL}${ANDROID_CHROME_ICON_192}`;
      break;

    case "android-chrome-256":
      filteredLogo = appLogo || `${WEBAPP_URL}${ANDROID_CHROME_ICON_256}`;
      break;

    default:
      filteredLogo = appLogo || `${WEBAPP_URL}${LOGO}`;
      break;
  }

  const response = await fetch(filteredLogo);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  res.setHeader("Content-Type", response.headers.get("content-type") as string);
  res.setHeader("Cache-Control", "s-maxage=86400");
  res.send(buffer);
}
