"use client";

import type { GlobalCal, GlobalCalWithoutNs } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

import Cal from "./Cal";

export const getCalApi = (options?: {
  embedJsUrl?: string;
  namespace?: string;
}): Promise<GlobalCal | GlobalCalWithoutNs> => {
  options = options || {};
  const { namespace, embedJsUrl } = options;
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
};

export default Cal;
