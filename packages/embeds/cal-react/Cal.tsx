import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

export default function Cal() {
  const Cal = useEmbed();
  const ref = useRef();
  useEffect(() => {
    if (!Cal) {
      return;
    }
    Cal("init");
    Cal("inline", {
      elementOrSelector: ref.current,
      calendarLink: "pro?case=1",
      config: {
        name: "Hariom Balhara",
        email: "hariombalhara@gmail.com",
        notes: "Test Meeting",
        guests: JSON.stringify(["hariom@gmail.com"]),
        theme: "dark",
      },
    });
  }, [Cal]);
  if (!Cal) {
    return null;
  }
  return <div ref={ref}></div>;
}
