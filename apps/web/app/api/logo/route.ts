import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
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

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const log = logger.getSubLogger({ prefix: ["[api/logo]"] });

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

async function getTeamLogos(subdomain: string, isValidOrgDomain: boolean) {
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
    const team = await prisma.team.findFirst({
      where: {
        slug: subdomain,
        ...(isValidOrgDomain && {
          OR: [
            {
              metadata: {
                path: ["isOrganization"],
                equals: true,
              },
            },
            {
              isOrganization: true,
            },
          ],
        }),
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
async function getHandler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = logoApiSchema.parse(Object.fromEntries(searchParams.entries()));

  // Create a legacy request object for compatibility
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const { isValidOrgDomain } = orgDomainConfig(legacyReq);

  const hostname = request.headers.get("host");
  if (!hostname) {
    return NextResponse.json({ error: "No hostname" }, { status: 400 });
  }

  const domains = extractSubdomainAndDomain(hostname);
  if (!domains) {
    return NextResponse.json({ error: "No domains" }, { status: 400 });
  }

  const [subdomain] = domains;
  const teamLogos = await getTeamLogos(subdomain, isValidOrgDomain);

  // Resolve all icon types to team logos, falling back to Cal.com defaults.
  const type: LogoType = parsedQuery?.type && isValidLogoType(parsedQuery.type) ? parsedQuery.type : "logo";
  const logoDefinition = logoDefinitions[type];
  const filteredLogo = teamLogos[logoDefinition.source] ?? logoDefinition.fallback;

  try {
    const response = await fetch(filteredLogo);
    const arrayBuffer = await response.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let contentType = response.headers.get("content-type") || "image/png";

    // Resize the team logos if needed
    if (teamLogos[logoDefinition.source] && logoDefinition.w) {
      const { resizeImage } = await import("@calcom/lib/server/imageUtils");
      const { buffer: outBuffer, contentType: outContentType } = await resizeImage({
        buffer,
        width: logoDefinition.w,
        height: logoDefinition.h,
        quality: 100,
        contentType,
      });
      buffer = outBuffer;
      contentType = outContentType;
    }

    // Create a new response with the image buffer
    const imageResponse = new NextResponse(buffer as BodyInit);

    // Set the appropriate headers
    imageResponse.headers.set("Content-Type", contentType);
    imageResponse.headers.set("Cache-Control", "s-maxage=86400, stale-while-revalidate=60");

    return imageResponse;
  } catch (error) {
    return NextResponse.json({ error: "Failed fetching logo" }, { status: 404 });
  }
}

export const GET = defaultResponderForAppDir(getHandler);
