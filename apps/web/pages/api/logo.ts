import fs from "fs";
import mime from "mime-types";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { z } from "zod";

import { LOGO, LOGO_ICON } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

const log = logger.getChildLogger({ prefix: [`[api/logo]`] });

function removePort(url: string) {
  return url.replace(/:\d+$/, "");
}

function extractSubdomainAndDomain(url: string): [string, string] | null {
  try {
    const parsedUrl = new URL(url);
    const hostParts = parsedUrl.href.split(".");
    if (hostParts.length > 2) {
      const subdomain = hostParts.slice(0, hostParts.length - 2).join(".");
      const domain = hostParts.slice(hostParts.length - 2).join(".");
      return [subdomain, removePort(domain)];
    } else if (hostParts.length === 2) {
      const subdomain = "";
      const domain = hostParts.join(".");
      return [subdomain, removePort(domain)];
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

const logoApiSchema = z.object({
  icon: z.coerce.boolean().optional(),
});

function handleDefaultLogo(
  req: NextApiRequest,
  res: NextApiResponse,
  parsedQuery?: z.infer<typeof logoApiSchema>
) {
  let fileNameParts = LOGO.split(".");

  if (parsedQuery?.icon) {
    fileNameParts = LOGO_ICON.split(".");
  }

  const { [fileNameParts.length - 1]: fileExtension } = fileNameParts;
  const STATIC_PATH = path.join(process.cwd(), "public" + LOGO);
  const imageBuffer = fs.readFileSync(STATIC_PATH);
  const mimeType = mime.lookup(fileExtension);
  if (mimeType) res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "s-maxage=86400");
  res.send(imageBuffer);
}

/**
 * This API endpoint is used to serve the logo associated with a team if no logo is found we serve our default logo
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { query } = req;
    const parsedQuery = logoApiSchema.parse(query);

    const hostname = req?.headers["host"];
    if (!hostname) throw new Error("No hostname");
    const domains = extractSubdomainAndDomain(hostname);
    if (!domains) throw new Error("No domains");
    const [subdomain, domain] = domains;
    // Only supported on cal.com and cal.dev
    if (!["cal.com", "cal.dev"].includes(domain)) return handleDefaultLogo(req, res, parsedQuery);
    // Skip if no subdomain
    if (!subdomain) throw new Error("No subdomain");
    // Omit system subdomains
    if (["console", "app", "www"].includes(subdomain)) return handleDefaultLogo(req, res, parsedQuery);

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

    const filteredLogo = parsedQuery?.icon ? team?.appIconLogo : team?.appLogo;

    if (!filteredLogo) throw new Error("No team appLogo");

    const response = await fetch(filteredLogo);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", response.headers.get("content-type") as string);
    res.setHeader("Cache-Control", "s-maxage=86400");
    res.send(buffer);
  } catch (e) {
    if (e instanceof Error) log.debug(e.message);
    handleDefaultLogo(req, res);
  }
}
