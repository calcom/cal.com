import { dub } from "@calcom/features/auth/lib/dub";
import logger from "@calcom/lib/logger";
import type { IUrlShortenerProvider, ShortenOptions, ShortenResult } from "../IUrlShortenerProvider";

const log = logger.getSubLogger({ prefix: ["dub-shortener"] });

export class DubShortener implements IUrlShortenerProvider {
  static isConfigured(): boolean {
    return Boolean(process.env.DUB_API_KEY);
  }

  async shortenMany(urls: string[], options?: ShortenOptions): Promise<ShortenResult[]> {
    try {
      const linksToShorten = urls.filter((link) => link);
      const dubResults = await dub.links.createMany(
        linksToShorten.map((url) => ({
          domain: options?.domain,
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
}
