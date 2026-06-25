"use client";

import { useEffect, useRef } from "react";

import type { PrefillAndIframeAttrsConfig } from "@calcom/embed-core";

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

  // Effect 1: One-time initialization.
  // The initializedRef guard is intentional here — it prevents double-init
  // (e.g. React Strict Mode double-invocation). config and calLink are
  // intentionally excluded from this effect's dep array; they are handled
  // reactively in Effect 2 below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // NOTE: config and calLink deliberately omitted — see Effect 2.
  }, [Cal, namespace, calOrigin, initConfig]);

  // Effect 2: Reactive config + calLink updates after initialization.
  // Runs whenever config or calLink changes. Skips silently before init
  // completes (initializedRef.current === false).
  useEffect(() => {
    if (!Cal || !initializedRef.current) {
      return;
    }
    if (namespace) {
      Cal.ns[namespace]("ui", { ...config });
    } else {
      Cal("ui", { ...config });
    }
  }, [Cal, namespace, config, calLink]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
