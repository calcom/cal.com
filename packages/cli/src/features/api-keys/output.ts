import { renderSuccess, type OutputOptions } from "../../shared/output";
import type { ApiKey } from "./types";

function maskApiKey(apiKey: string): string {
  const prefix = apiKey.slice(0, 7);
  const suffix = apiKey.length > 11 ? apiKey.slice(-4) : "";
  return `${prefix}...${suffix}`;
}

export function renderApiKeyRefreshed(data: ApiKey | undefined, { json }: OutputOptions = {}): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!data?.apiKey) {
    console.log("No API key data returned.");
    return;
  }

  renderSuccess("API key refreshed successfully!");
  console.log(`\nNew API Key: ${maskApiKey(data.apiKey)}`);
  console.log("\nThe full key was returned in the API response. Use --json to capture it programmatically.");
}
