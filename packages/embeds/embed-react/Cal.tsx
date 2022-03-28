import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

export default function Cal({ calendarLink, config }: { calendarLink: string; config?: any }) {
  const Cal = useEmbed();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!Cal) {
      return;
    }
    Cal("init");
    Cal("inline", {
      elementOrSelector: ref.current,
      calendarLink,
      config,
    });
  }, [Cal, calendarLink, config]);

  if (!Cal) {
    return <div>Loading {calendarLink}</div>;
  }

  return <div ref={ref}></div>;
}
