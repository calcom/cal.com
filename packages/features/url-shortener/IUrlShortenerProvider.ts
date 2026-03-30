export interface ShortenResult {
  shortLink: string;
}

export interface ShortenOptions {
  domain?: string;
  folderId?: string;
}

export interface IUrlShortenerProvider {
  shortenMany(urls: string[], options?: ShortenOptions): Promise<ShortenResult[]>;
}
