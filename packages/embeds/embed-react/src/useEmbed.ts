"use client";

import { useEffect, useState } from "react";

import { getCalApi } from "@calcom/embed-react";

export default function useEmbed(embedJsUrl?: string) {
  const [calInstance, setCalInstance] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cal = await getCalApi({ namespace: "project-call" });

        if (!mounted) return;

        if (cal) {
          // Initialize the embed UI
          cal("ui", {
            styles: {
              branding: { brandColor: "#000000" },
            },
            hideEventTypeDetails: false,
            layout: "month_view",
          });

          setCalInstance(cal);
        }
      } catch (err) {
        console.error("Failed to initialize Cal embed:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [embedJsUrl]);

  return calInstance;
}
