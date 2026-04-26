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

  // Initialize the embed once on first mount.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once; config updates handled separately
  }, [Cal, calLink, namespace, calOrigin, initConfig]);

  // Propagate config prop changes to the already-initialized embed via the `ui` command.
  // The initialization effect above only runs once, so config changes would otherwise be lost.
  useEffect(() => {
    if (!Cal || !initializedRef.current) {
      return;
    }
    // Extract the subset of config fields that the `ui` command accepts.
    const { theme, layout } = config ?? {};
    if (theme === undefined && layout === undefined) {
      return;
    }
    if (namespace) {
      Cal.ns[namespace]("ui", { theme, layout });
    } else {
      Cal("ui", { theme, layout });
    }
  }, [Cal, namespace, config]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
