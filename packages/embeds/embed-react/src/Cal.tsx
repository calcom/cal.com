import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

export default function Cal({
  calLink,
  calOrigin,
  config,
  embedJsUrl,
}: {
  calOrigin?: string;
  calLink: string;
  config?: any;
  embedJsUrl?: string;
}) {
  const Cal = useEmbed(embedJsUrl);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!Cal) {
      return;
    }
    const element = ref.current;
    let initConfig = {};
    if (calOrigin) {
      (initConfig as any).origin = calOrigin;
    }
    Cal("init", initConfig);
    Cal("inline", {
      elementOrSelector: element,
      calLink,
      config,
    });
    return () => {
      element?.querySelector(".cal-embed")?.remove();
    };
  }, [Cal, calLink, config, calOrigin]);

  if (!Cal) {
    return <div>Loading {calLink}</div>;
  }

  return <div ref={ref}></div>;
}
