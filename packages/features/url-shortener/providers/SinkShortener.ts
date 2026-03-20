import logger from "@calcom/lib/logger";
import type { IUrlShortenerProvider, ShortenOptions, ShortenResult } from "../IUrlShortenerProvider";
import type { SinkClient } from "./SinkClient";

const log = logger.getSubLogger({ prefix: ["sink-shortener"] });

export class SinkShortener implements IUrlShortenerProvider {
  constructor(private client: SinkClient) {}

  static isConfigured(): boolean {
    return Boolean(process.env.SINK_API_URL && process.env.SINK_API_KEY);
  }

  async shortenMany(urls: string[], _options?: ShortenOptions): Promise<ShortenResult[]> {
    try {
      const results = await this.client.createMany(urls);
      return results.map((result) => ({
        shortLink: result.shortLink || result.url,
      }));
    } catch (error) {
      log.error("Sink shortening failed, returning original URLs", error);
      return urls.map((url) => ({ shortLink: url }));
    }
  }
}
