import fs from "fs";
import mime from "mime-types";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

import { LOGO } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getChildLogger({ prefix: [`[api/logo]`] });

function extractSubdomainAndDomain(url: string): [string, string] | null {
  try {
    const parsedUrl = new URL(url);
    const hostParts = parsedUrl.hostname.split(".");
    if (hostParts.length > 2) {
      const subdomain = hostParts.slice(0, hostParts.length - 2).join(".");
      const domain = hostParts.slice(hostParts.length - 2).join(".");
      return [subdomain, domain];
    } else if (hostParts.length === 2) {
      const subdomain = "";
      const domain = hostParts.join(".");
      return [subdomain, domain];
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

function handleDefaultLogo(req: NextApiRequest, res: NextApiResponse) {
  const fileNameParts = LOGO.split(".");
  const { [fileNameParts.length - 1]: fileExtension } = fileNameParts;
  const STATIC_PATH = path.join(process.cwd(), "public" + LOGO);
  const imageBuffer = fs.readFileSync(STATIC_PATH);
  const mimeType = mime.lookup(fileExtension);
  if (mimeType) res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "s-maxage=86400");
  res.send(imageBuffer);
}

/**
 * This endpoint should allow us to access to the private files in the static
 * folder of each individual app in the App Store.
 * @example
 * ```text
 * Requesting: `/api/app-store/zoomvideo/icon.svg` from a public URL should
 * serve us the file located at: `/packages/app-store/zoomvideo/static/icon.svg`
 * ```
 * This will allow us to keep all app-specific static assets in the same directory.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const hostname = req?.headers["host"];
    if (!hostname) throw new Error("No hostname");
    const domains = extractSubdomainAndDomain(hostname);
    if (!domains) throw new Error("No domains");
    const [subdomain, domain] = domains;
    // Only supported on cal.com and cal.dev
    if (!["cal.com", "cal.dev"].includes(domain)) throw new Error("Not supported");
    // Skip if no subdomain
    if (!subdomain) throw new Error("No subdomain");
    // Omit system subdomains
    if (["console", "app", "www"].includes(subdomain)) throw new Error("System subdomain");

    const { default: prisma } = await import("@calcom/prisma");
    const team = await prisma.team.findUnique({
      where: {
        slug: subdomain,
      },
      select: {
        appLogo: true,
      },
    });

    if (!team?.appLogo) throw new Error("No team appLogo");

    const response = await fetch(team.appLogo);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", response.headers.get("content-type") as string);
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(buffer);
  } catch (e) {
    console.error(e);
    if (e instanceof Error) log.debug(e.message);
    handleDefaultLogo(req, res);
  }
}
