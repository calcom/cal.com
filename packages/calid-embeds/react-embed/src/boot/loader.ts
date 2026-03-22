"use client";

import type { GlobalCal, GlobalCalNoNs } from "@calid/embed-runtime";

const baseUrl =
  import.meta.env.EMBED_PUBLIC_WEBAPP_URL || `https://${import.meta.env.EMBED_PUBLIC_VERCEL_URL}`;

export const defaultEmbedSrc = import.meta.env.EMBED_PUBLIC_EMBED_LIB_URL || `${baseUrl}/embed-link/embed.js`;

type PartialCal = Omit<Window["Cal"], "ns" | "q"> & {
  ns?: GlobalCal["ns"];
  q?: GlobalCal["q"];
};

export function mountCalLoader(src: string): GlobalCal {
  const w = window as Window & { Cal: GlobalCal };

  if (!w.Cal) {
    const push = (t: GlobalCalNoNs, a: IArguments) => t.q.push(a as never);

    w.Cal = function () {
      const root = w.Cal;
      // eslint-disable-next-line prefer-rest-params
      const a = arguments;

      if (!root.loaded) {
        root.ns = {};
        root.q = root.q || [];
        (document.head.appendChild(document.createElement("script")) as HTMLScriptElement).src = src;
        root.loaded = true;
      }

      if (a[0] === "init") {
        const child: GlobalCalNoNs = function () {
          // eslint-disable-next-line prefer-rest-params
          push(child, arguments);
        };
        child.q = child.q || [];
        const name = a[1];
        if (typeof name === "string") {
          root.ns![name] = root.ns![name] || child;
          push(root.ns![name], a);
          push(root as GlobalCal, ["initNamespace", name] as never);
        } else {
          push(root as GlobalCal, a);
        }
        return;
      }

      push(root as GlobalCal, a);
    } as unknown as GlobalCal;
  }

  return w.Cal;
}
