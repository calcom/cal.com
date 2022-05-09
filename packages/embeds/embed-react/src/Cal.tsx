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
  if (!calLink) {
    throw new Error("calLink is required");
  }
  const initializedRef = useRef(false);
  const Cal = useEmbed(embedJsUrl);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!Cal || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
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
  }, [Cal, calLink, config, calOrigin]);

  if (!Cal) {
    return <div>Loading {calLink}</div>;
  }

  return <div ref={ref}></div>;
}
