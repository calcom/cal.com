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
  type: z.coerce.string().optional(),
});

const SYSTEM_SUBDOMAINS = ["console", "app", "www"];

type LogoType =
  | "logo"
  | "icon"
  | "favicon-16"
  | "favicon-32"
  | "apple-touch-icon"
  | "mstile"
  | "android-chrome-192"
  | "android-chrome-256";

type LogoTypeDefinition = {
  fallback: string;
  w?: number;
  h?: number;
  source: "appLogo" | "appIconLogo";
};

const logoDefinitions: Record<LogoType, LogoTypeDefinition> = {
  logo: {
    fallback: `${WEBAPP_URL}${LOGO}`,
    source: "appLogo",
  },
  icon: {
    fallback: `${WEBAPP_URL}${LOGO_ICON}`,
    source: "appIconLogo",
  },
  "favicon-16": {
    fallback: `${WEBAPP_URL}${FAVICON_16}`,
    w: 16,
    h: 16,
    source: "appIconLogo",
  },
  "favicon-32": {
    fallback: `${WEBAPP_URL}${FAVICON_32}`,
    w: 32,
    h: 32,
    source: "appIconLogo",
  },
  "apple-touch-icon": {
    fallback: `${WEBAPP_URL}${APPLE_TOUCH_ICON}`,
    w: 180,
    h: 180,
    source: "appLogo",
  },
  mstile: {
    fallback: `${WEBAPP_URL}${MSTILE_ICON}`,
    w: 150,
    h: 150,
    source: "appLogo",
  },
  "android-chrome-192": {
    fallback: `${WEBAPP_URL}${ANDROID_CHROME_ICON_192}`,
    w: 192,
    h: 192,
    source: "appLogo",
  },
  "android-chrome-256": {
    fallback: `${WEBAPP_URL}${ANDROID_CHROME_ICON_256}`,
    w: 256,
    h: 256,
    source: "appLogo",
  },
};

function isValidLogoType(type: string): type is LogoType {
  return type in logoDefinitions;
}

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
    const team = await prisma.team.findUnique({
      where: {
        slug: subdomain,
      },
      select: {
        appLogo: true,
        appIconLogo: true,
      },
    });

    return {
      appLogo: team?.appLogo,
      appIconLogo: team?.appIconLogo,
    };
  } catch (error) {
    if (error instanceof Error) log.debug(error.message);
    return {
      appLogo: undefined,
      appIconLogo: undefined,
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
  const teamLogos = await getTeamLogos(subdomain);

  // Resolve all icon types to team logos, falling back to Cal.com defaults.
  const type: LogoType = parsedQuery?.type && isValidLogoType(parsedQuery.type) ? parsedQuery.type : "logo";
  const logoDefinition = logoDefinitions[type];
  const filteredLogo = teamLogos[logoDefinition.source] ?? logoDefinition.fallback;

  try {
    const response = await fetch(filteredLogo);
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // If we need to resize the team logos (via Next.js' built-in image processing)
    if (teamLogos[logoDefinition.source] && logoDefinition.w) {
      const { detectContentType, optimizeImage } = await import("next/dist/server/image-optimizer");
      buffer = await optimizeImage({
        buffer,
        contentType: detectContentType(buffer) ?? "image/jpeg",
        quality: 100,
        width: logoDefinition.w,
        height: logoDefinition.h, // optional
      });
    }

    res.setHeader("Content-Type", response.headers.get("content-type") as string);
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(buffer);
  } catch (error) {
    res.statusCode = 404;
    res.json({ error: "Failed fetching logo" });
  }
}
