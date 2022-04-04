/**
 * As we want to keep control on the size of this snippet but we want some portion of it to be still readable.
 * So, write the code that you need directly but keep it short.
 */
import { Cal as CalClass, Instruction, InstructionQueue } from "@calcom/embed-core/src/embed";

export interface GlobalCal {
  (methodName: string, arg?: any): void;
  /** Marks that the embed.js is loaded. Avoids re-downloading it. */
  loaded?: boolean;
  /** Maintains a queue till the time embed.js isn't loaded */
  q?: InstructionQueue;
  /** If user registers multiple namespaces, those are available here */
  ns?: Record<string, GlobalCal>;
  instance?: CalClass;
}

export interface CalWindow extends Window {
  Cal?: GlobalCal;
}

export default function EmbedSnippet(url = "https://cal.com/embed.js") {
  /*!  Copy the code below and paste it in script tag of your website */
  (function (C: CalWindow, A, L) {
    let p = function (a: any, ar: any) {
      a.q.push(ar);
    };
    let d = C.document;
    C.Cal =
      C.Cal ||
      function () {
        let cal = C.Cal!;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
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
