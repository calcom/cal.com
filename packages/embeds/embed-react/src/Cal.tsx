"use client";

import type { PrefillAndIframeAttrsConfig } from "@calcom/embed-core";
import { useEffect, useRef } from "react";
import useEmbed from "./useEmbed";

type CalProps = {
  calOrigin?: string;
  calLink: string;
  initConfig?: {
    debug?: boolean;
    uiDebug?: boolean;
  };
  namespace?: string;
  config?: PrefillAndIframeAttrsConfig;
  embedJsUrl?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const Cal = function Cal(props: CalProps) {
  const { calLink, calOrigin, namespace = "", config, initConfig = {}, embedJsUrl, ...restProps } = props;
  if (!calLink) {
    throw new Error("calLink is required");
  }
  const initializedRef = useRef(false);
  const Cal = useEmbed(embedJsUrl);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!Cal || initializedRef.current || !ref.current) {
      return;
    }
    initializedRef.current = true;
    const element = ref.current;
    if (namespace) {
      Cal("init", namespace, {
        ...initConfig,
        origin: calOrigin,
      });
      Cal.ns[namespace]("inline", {
        elementOrSelector: element,
        calLink,
        config,
      });
    } else {
      Cal("init", {
        ...initConfig,
        origin: calOrigin,
      });
      Cal("inline", {
        elementOrSelector: element,
        calLink,
        config,
      });
    }
  }, [Cal, calLink, config, namespace, calOrigin, initConfig]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
