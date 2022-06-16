/* eslint-disable prefer-const */
import { useEffect, useRef } from "react";

import useEmbed from "./useEmbed";

type CalProps = {
  calOrigin?: string;
  calLink: string;
  config?: any;
  embedJsUrl?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const Cal = function Cal(props: CalProps) {
  const { calLink, calOrigin, config, embedJsUrl, ...restProps } = props;
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
    return <div {...restProps}>Loading {calLink} </div>;
  }

  return <div ref={ref} {...restProps}></div>;
};
export default Cal;
