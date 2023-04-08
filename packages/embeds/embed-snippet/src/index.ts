/* eslint-disable @typescript-eslint/ban-ts-comment,prefer-rest-params,prefer-const */
import type { GlobalCal, GlobalCalWithoutNs } from "@calcom/embed-core";
import type { Optional } from "@calcom/types/utils";

/**
 * As we want to keep control on the size of this snippet but we want some portion of it to be still readable.
 * So, write the code that you need directly but keep it short.
 */

const WEBAPP_URL =
  import.meta.env.EMBED_PUBLIC_WEBAPP_URL || `https://${import.meta.env.EMBED_PUBLIC_VERCEL_URL}`;

const EMBED_LIB_URL = import.meta.env.EMBED_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;

export default function EmbedSnippet(url = EMBED_LIB_URL) {
  (function (C, A, L) {
    let p = function (a: GlobalCalWithoutNs, ar: IArguments) {
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

          //@ts-ignore
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }

        if (ar[0] === L) {
          const api: GlobalCalWithoutNs = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          typeof namespace === "string"
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              (cal.ns![namespace] = api) && p(api, ar)
            : p(cal as GlobalCal, ar);
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
