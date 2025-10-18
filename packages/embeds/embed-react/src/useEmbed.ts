import { useEffect, useState } from "react";

import { getCalApi } from "@calcom/embed-react";

export default function useEmbed(embedJsUrl?: string) {
  const [calInstance, setCalInstance] = useState<ReturnType<typeof getCalApi> | null>(null);

  useEffect(() => {
    let mounted = true;
    let teardown: (() => void) | undefined;

    (async () => {
      try {
        const cal = await getCalApi({ embedJsUrl });

        if (!mounted) return;
        if (cal) {
          // Do not force UI configuration here; let consumers call cal("ui", ...) if they want custom UI.
          setCalInstance(cal);
        }

        teardown = () => {
          try {
            (cal as any)("destroy");
          } catch {}
          const w = window as any;
          if (w?.Cal?.instance?.inlineEl) delete w.Cal.instance.inlineEl;
        };
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
