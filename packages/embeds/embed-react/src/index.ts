import type { CalWindow } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

import Cal from "./Cal";

export const getCalApi = (): Promise<CalWindow["Cal"]> =>
  new Promise(function tryReadingFromWindow(resolve) {
    EmbedSnippet();
    const api = (window as CalWindow).Cal;
    if (!api) {
      setTimeout(() => {
        tryReadingFromWindow(resolve);
      }, 50);
      return;
    }
    resolve(api);
  });

export default Cal;
