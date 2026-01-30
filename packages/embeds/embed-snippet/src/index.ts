/* eslint-disable @typescript-eslint/no-non-null-assertion */

/* eslint-disable @typescript-eslint/ban-ts-comment,prefer-rest-params,prefer-const */
import type { GlobalCal, GlobalCalWithoutNs, Queue } from "@calcom/embed-core";
// FIXME: embed-snippet is a published package and shouldn't import from @calcom/types which is unpublished
// This isn't a problem at the moment because embed-snippet isn't directly imported and embed-react which uses it doesn't depend on this
// eslint-disable-next-line no-restricted-imports
import type { Optional } from "@calcom/types/utils";

/**
 * As we want to keep control on the size of this snippet but we want some portion of it to be still readable.
 * So, write the code that you need directly but keep it short.
 */

const WEBAPP_URL =
  import.meta.env.EMBED_PUBLIC_WEBAPP_URL || `https://${import.meta.env.EMBED_PUBLIC_VERCEL_URL}`;

const EMBED_LIB_URL = import.meta.env.EMBED_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;

type QueuePushArg = {
  [k: number]: Queue[number];
};

/**
 * When modifying this snippet, make sure to keep the snippets in following places in sync
 * 1. EmbedTabs.tsx
 * 2. embed-core/index.html
 * 3. app-store/wordpress/plugin.php
 */
export default function EmbedSnippet(url = EMBED_LIB_URL) {
  (function (C, A, L) {
    let p = function (a: GlobalCalWithoutNs, ar: QueuePushArg) {
      a.q.push(ar);
    };
    let d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          // 'ns' and 'q' are now definitely set with the following 2 lines, so you can safely assert in TypeScript that it's GlobalCal now.
          cal.ns = {};
          cal.q = cal.q || [];

          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }

        if (ar[0] === L) {
          const api: GlobalCalWithoutNs = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            // Make sure that even after re-execution of the snippet, the namespace is not overridden
            cal.ns![namespace] = cal.ns![namespace] || api;
            p(cal.ns![namespace], ar);
            // Inform the default namespace queue to initialize this namespace
            p(cal as GlobalCal, ["initNamespace", namespace]);
          } else p(cal as GlobalCal, ar);
          return;
        }
        p(cal as GlobalCal, ar);
      };
  })(
    window as Omit<Window, "Cal"> & {
      // Make 'ns' and 'q' optional as they are set through the snippet above
      Cal: Optional<GlobalCal, "ns" | "q">;
    },
    //! Replace it with "https://cal.com/embed.js" or the URL where you have embed.js installed
    url,
    "init"
  );
  /*!  Copying ends here. */

  return window.Cal;
}

export const EmbedSnippetString = EmbedSnippet.toString();
