/* eslint-disable prefer-const */
import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

type CalProps = {
  calOrigin?: string;
  calLink: string;
  debug: boolean;
  config?: any;
  embedJsUrl?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const Cal = function Cal(props: CalProps) {
  const { calLink, calOrigin, debug, config, embedJsUrl, ...restProps } = props;
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
      (initConfig as any).debug = debug;
    }
    Cal("init", initConfig);
    Cal("inline", {
      elementOrSelector: element,
      calLink,
      config,
    });
  }, [Cal, calLink, config, calOrigin, debug]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
