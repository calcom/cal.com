import { CalWindow } from "@calcom/embed-core";
import EmbedSnippet from "@calcom/embed-snippet";

import Cal, { getEmbedJsUrl } from "./Cal";

/**
 *  TODO: Run these tests and then delete the comment
 * - Test getCalApi with ns
 * - Test getCalApi without ns
 */

/**
 * It can be used independently of the `Cal` component. So, a component can import and call just this method to get 'floating button popup' or 'element click popup working'
 */
export const getCalApi = ({
  embedJsUrl,
  calOrigin,
  ns,
}: {
  embedJsUrl?: string;
  calOrigin?: string;
  ns?: string;
}): Promise<CalWindow["Cal"]> =>
  new Promise(function tryReadingFromWindow(resolve) {
    let api = (window as CalWindow).Cal;
    EmbedSnippet(getEmbedJsUrl({ embedJsUrl, calOrigin }));

    if (!api) {
      setTimeout(() => {
        tryReadingFromWindow(resolve);
      }, 50);
      return;
    }

    if (ns) {
      api("init", ns, {
        origin: calOrigin,
      });
      api = api.ns && api.ns[ns];
    } else {
      api("init", {
        origin: calOrigin,
      });
    }

    resolve(api);
  });

export default Cal;
