"use client";

import type { GlobalCal } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

import Cal from "./Cal";

export const getCalApi = (): Promise<GlobalCal> =>
  new Promise(function tryReadingFromWindow(resolve) {
    EmbedSnippet();
    const api = window.Cal;
    if (!api) {
      setTimeout(() => {
        tryReadingFromWindow(resolve);
      }, 50);
      return;
    }
    resolve(api);
  });

export default Cal;
