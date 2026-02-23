import type { IUrlShortenerProvider, ShortenOptions, ShortenResult } from "../IUrlShortenerProvider";

export class NoopShortener implements IUrlShortenerProvider {
  async shortenMany(urls: string[], _options?: ShortenOptions): Promise<ShortenResult[]> {
    return urls.map((url) => ({ shortLink: url }));
  }
}
