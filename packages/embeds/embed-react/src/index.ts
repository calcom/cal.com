"use client";

import type { GlobalCal, GlobalCalWithoutNs } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

import Cal from "./Cal";

// Exporting for consumption by @calcom/embed-react user
export type { EmbedEvent } from "@calcom/embed-core";

export function getCalApi(options?: {
  embedJsUrl?: string;
  namespace?: string;
}): Promise<GlobalCal | GlobalCalWithoutNs>;
export function getCalApi(embedJsUrl: string): Promise<GlobalCal | GlobalCalWithoutNs>;

export function getCalApi(
  optionsOrEmbedJsUrl?:
    | {
        embedJsUrl?: string;
        namespace?: string;
      }
    | string
): Promise<GlobalCal | GlobalCalWithoutNs> {
  const options =
    typeof optionsOrEmbedJsUrl === "string" ? { embedJsUrl: optionsOrEmbedJsUrl } : optionsOrEmbedJsUrl ?? {};

  const { namespace = "", embedJsUrl } = options;
  return new Promise(function tryReadingFromWindow(resolve) {
    const globalCal = EmbedSnippet(embedJsUrl);
    globalCal("init", namespace);
    const api = namespace ? globalCal.ns[namespace as keyof typeof globalCal.ns] : globalCal;
    if (!api) {
      setTimeout(() => {
        tryReadingFromWindow(resolve);
      }, 50);
      return;
    }
    resolve(api);
  });
}

export default Cal;
