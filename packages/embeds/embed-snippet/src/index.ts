/* eslint-disable prefer-rest-params */

/**
 * As we want to keep control on the size of this snippet but we want some portion of it to be still readable.
 * So, write the code that you need directly but keep it short.
 */
import type { Cal as CalClass, InstructionQueue } from "@calcom/embed-core/src/embed";

const WEBAPP_URL =
  import.meta.env.NEXT_PUBLIC_WEBAPP_URL || `https://${import.meta.env.NEXT_PUBLIC_VERCEL_URL}`;

const EMBED_LIB_URL = import.meta.env.NEXT_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;

export interface GlobalCal {
  (methodName: string, arg?: any): void;
  /** Marks that the embed.js is loaded. Avoids re-downloading it. */
  loaded?: boolean;
  /** Maintains a queue till the time embed.js isn't loaded */
  q?: InstructionQueue;
  /** If user registers multiple namespaces, those are available here */
  ns?: Record<string, GlobalCal>;
  instance?: CalClass;
  __css?: string;
  fingerprint?: string;
  __logQueue?: any[];
}

export interface CalWindow extends Window {
  Cal?: GlobalCal;
}

export default function EmbedSnippet(url = EMBED_LIB_URL) {
  (function (C: CalWindow, A, L) {
    const p = function (a: any, ar: any) {
      a.q.push(ar);
    };
    const d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        const cal = C.Cal!;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }

        if (ar[0] === L) {
          const api: { (): void; q: any[] } = function () {
            p(api, arguments);
          };
          const namespace = ar[1];
          api.q = api.q || [];
          typeof namespace === "string" ? (cal.ns![namespace] = api) && p(api, ar) : p(cal, ar);
          return;
        }
        p(cal, ar);
      };
  })(
    window,
    //! Replace it with "https://cal.com/embed.js" or the URL where you have embed.js installed
    url,
    "init"
  );
  /*!  Copying ends here. */

  return (window as CalWindow).Cal;
}

export const EmbedSnippetString = EmbedSnippet.toString();
