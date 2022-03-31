import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

export default function Cal({
  calLink,
  config,
  embedJsUrl,
}: {
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
    Cal("init");
    Cal("inline", {
      elementOrSelector: ref.current,
      calLink,
      config,
    });
  }, [Cal, calLink, config]);

  if (!Cal) {
    return <div>Loading {calLink}</div>;
  }

  return <div ref={ref}></div>;
}
