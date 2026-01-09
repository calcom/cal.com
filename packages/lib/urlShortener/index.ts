import logger from "@calcom/lib/logger";
import { dub } from "@calcom/features/auth/lib/dub";

import { sink } from "./sink";

const log = logger.getSubLogger({ prefix: ["url-shortener"] });

export class UrlShortener {
  async shortenMany(
    urls: string[],
    options?: { domain?: string; folderId?: string }
  ): Promise<{ shortLink: string }[]> {
    if (sink.isConfigured()) {
      try {
        const results = await sink.createMany(urls);
        return results.map((result) => ({
          shortLink: result.shortLink || result.url,
        }));
      } catch (error) {
        log.error("Sink shortening failed, returning original URLs", error);
        return urls.map((url) => ({ shortLink: url }));
      }
    }

    if (process.env.DUB_API_KEY) {
      try {
        const linksToShorten = urls.filter((link) => link);
        const dubResults = await dub.links.createMany(
          linksToShorten.map((url) => ({
            domain: options?.domain || "sms.cal.com",
            url,
            folderId: options?.folderId,
          }))
        );

        return urls.map((url) => {
          const createdLink = dubResults.find(
            (result): result is Extract<typeof result, { url: string }> =>
              !("error" in result) && result.url === url
          );
          return { shortLink: createdLink?.shortLink || url };
        });
      } catch (error) {
        log.error("Dub shortening failed, returning original URLs", error);
        return urls.map((url) => ({ shortLink: url }));
      }
    }

    log.debug("No URL shortener configured, returning original URLs");
    return urls.map((url) => ({ shortLink: url }));
  }
}

export const urlShortener: UrlShortener = new UrlShortener();
