import type { KVAdapter } from "./kv-adapter";

export interface CloudflareKVConfig {
  accountId: string;
  namespaceId: string;
  apiToken: string;
}

export class CloudflareKVAdapter implements KVAdapter {
  private baseUrl: string;
  private apiToken: string;

  constructor(config: CloudflareKVConfig) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/values`;
    this.apiToken = config.apiToken;
  }

  async get(key: string): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.apiToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Cloudflare KV GET failed: ${response.status}`);
    }

    return response.text();
  }

  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const url = ttlSeconds
      ? `${this.baseUrl}/${encodeURIComponent(key)}?expiration_ttl=${ttlSeconds}`
      : `${this.baseUrl}/${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "text/plain",
      },
      body: value,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare KV PUT failed: ${response.status}`);
    }
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.apiToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare KV DELETE failed: ${response.status}`);
    }
  }
}
