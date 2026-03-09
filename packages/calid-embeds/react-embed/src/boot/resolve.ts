"use client";

import type { GlobalCal, GlobalCalNoNs } from "@calid/embed-runtime";

import { defaultEmbedSrc, mountCalLoader } from "./loader";

type InitOptions = {
  namespace?: string;
  embedJsUrl?: string;
};

function parseInput(raw?: InitOptions | string): InitOptions {
  if (typeof raw === "string") return { embedJsUrl: raw };
  return raw ?? {};
}

export function getCalApi(options?: InitOptions): Promise<GlobalCal | GlobalCalNoNs>;
export function getCalApi(embedJsUrl: string): Promise<GlobalCal | GlobalCalNoNs>;
export function getCalApi(raw?: InitOptions | string): Promise<GlobalCal | GlobalCalNoNs> {
  const { namespace = "", embedJsUrl = defaultEmbedSrc } = parseInput(raw);

  return new Promise(function poll(done) {
    const root = mountCalLoader(embedJsUrl);
    root("init", namespace);

    const found = namespace ? root.ns?.[namespace as keyof typeof root.ns] : root;

    if (!found) {
      setTimeout(() => poll(done), 50);
      return;
    }

    done(found);
  });
}
