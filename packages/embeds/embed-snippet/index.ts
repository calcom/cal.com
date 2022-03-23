/**
 * As we want to keep control on the size of this snippet but we want some portion of it to be still readable.
 * So, write the code that you need directly but keep it short.
 */
export interface Cal {
  (method, arg): void;
  /** Marks that the embed.js is loaded. Avoids re-downloading it. */
  loaded?: boolean;
  /** Maintains a queue till the time embed.js isn't loaded */
  q?: unknown[];
  /** If user registers multiple namespaces, those are available here */
  ns?: Record<string, Cal>;
}

export interface CalWindow extends Window {
  Cal?: Cal;
}

export default function EmbedSnippet(url = "https://cal.com/embed.js") {
  (function (c: CalWindow, a, l) {
    let d = c.document;
    c.Cal =
      c.Cal ||
      function () {
        let C = c.Cal;
        let ar = arguments;
        if (!C.loaded) {
          C.ns = {};
          C.q = C.q || [];
          d.getElementsByTagName("head")[0].appendChild(d.createElement("script")).src = a;
          C.loaded = true;
        }

        if (ar[0] === l) {
          const api = function () {
            api.q.push(arguments);
          };
          const namespace = arguments[1];
          api.q = api.q || [];
          namespace ? (C.ns[namespace] = api) : null;
          return;
        }
        C.q.push(ar);
      };
  })(window, url, "init");
  return (window as CalWindow).Cal;
}
