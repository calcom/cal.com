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

  // Initialization effect: runs once per calLink/namespace/calOrigin change.
  // The initializedRef guard prevents double-initialization (e.g. React StrictMode),
  // but it is intentionally NOT in the dependency array so that config-only
  // changes are handled by the separate update effect below.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config updates are handled in the effect below
  }, [Cal, calLink, namespace, calOrigin, initConfig]);

  // Config update effect: propagates config prop changes to an already-initialized
  // embed via the `ui` command. Skips the very first render (handled above).
  useEffect(() => {
    if (!Cal || !initializedRef.current || !config) {
      return;
    }
    const { theme, ...rest } = config as PrefillAndIframeAttrsConfig & { theme?: string };
    const uiPayload: Record<string, unknown> = {};
    if (theme !== undefined) {
      uiPayload.theme = theme;
    }
    // Spread remaining ui-compatible fields (e.g. cssVarsPerTheme, styles)
    Object.assign(uiPayload, rest);
    if (Object.keys(uiPayload).length === 0) {
      return;
    }
    if (namespace) {
      Cal.ns[namespace]("ui", uiPayload);
    } else {
      Cal("ui", uiPayload);
    }
  }, [Cal, config, namespace]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
