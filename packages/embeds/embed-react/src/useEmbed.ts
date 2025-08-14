"use client";

import { useEffect, useState } from "react";

import { getCalApi } from "@calcom/embed-react";

export default function useEmbed(embedJsUrl?: string) {
  const [calInstance, setCalInstance] = useState<Awaited<ReturnType<typeof getCalApi>> | null>(null);

  useEffect(() => {
    let mounted = true;
    let teardown: (() => void) | undefined;

    (async () => {
      try {
        const cal = await getCalApi({ namespace: "project-call", embedJsUrl });

        if (!mounted) return;

        if (cal) {
          cal("ui", {
            styles: { branding: { brandColor: "#000000" } },
            hideEventTypeDetails: false,
            layout: "month_view",
          });

          setCalInstance(cal);

          teardown = () => {
            try {
              (cal as any)("destroy");
            } catch {}
            const w = window as any;
            if (w?.Cal?.instance?.inlineEl) delete w.Cal.instance.inlineEl;
          };
        }
      } catch (err) {
        console.error("Failed to initialize Cal embed:", err);
      }
    })();

    return () => {
      mounted = false;
      if (typeof teardown === "function") teardown();
    };
  }, [embedJsUrl]);

  return calInstance;
}
