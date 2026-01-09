import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["sink-url-shortener"] });

interface SinkLinkCreateRequest {
  url: string;
  slug?: string;
  comment?: string;
  expiration?: string;
  password?: string;
  disable?: boolean;
}

interface SinkLinkResponse {
  link: {
    id: string;
    url: string;
    slug: string;
    comment?: string;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    password?: string;
    disabled?: boolean;
    views: number;
  };
  shortLink: string;
}

export class SinkClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.SINK_API_URL || "";
    this.apiKey = process.env.SINK_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async createLink(url: string, options?: Partial<SinkLinkCreateRequest>): Promise<string | null> {
    if (!this.isConfigured()) {
      log.debug("Sink not configured, skipping link creation");
      return null;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      headers.Authorization = `Bearer ${this.apiKey}`;

      const response = await fetch(`${this.baseUrl}/api/link/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Sink API error: ${response.status} - ${errorText}`);
        return null;
      }

      const data = (await response.json()) as SinkLinkResponse;
      return data.shortLink;
    } catch (error) {
      log.error("Failed to create Sink link", error);
      return null;
    }
  }

  async createMany(
    links: string[],
    options?: Partial<SinkLinkCreateRequest>
  ): Promise<{ url: string; shortLink: string | null }[]> {
    if (!this.isConfigured()) {
      log.debug("Sink not configured, returning original links");
      return links.map((url) => ({ url, shortLink: null }));
    }

    const promises = links.map(async (url) => {
      if (!url) {
        return { url, shortLink: null };
      }

      const shortLink = await this.createLink(url, options);
      return { url, shortLink };
    });

    try {
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          log.error(`Failed to shorten link at index ${index}`, result.reason);
          return { url: links[index], shortLink: null };
        }
      });
    } catch (error) {
      log.error("Failed to create multiple Sink links", error);
      return links.map((url) => ({ url, shortLink: null }));
    }
  }
}

export const sink = new SinkClient();
