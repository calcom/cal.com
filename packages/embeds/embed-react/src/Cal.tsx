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
  const lastConfigRef = useRef<string>();
  const Cal = useEmbed(embedJsUrl);
  const ref = useRef<HTMLDivElement>(null);
  const configJson = JSON.stringify(config ?? {});

  useEffect(() => {
    if (!Cal || initializedRef.current || !ref.current) {
      return;
    }
    initializedRef.current = true;
    lastConfigRef.current = configJson;
    const element = ref.current;
    if (namespace) {
      Cal("init", namespace, {
        ...initConfig,
        origin: calOrigin,
      });
      Cal.ns[namespace]("inline", {
        elementOrSelector: element,
        calLink,
        config: config ? { ...config } : undefined,
      });
    } else {
      Cal("init", {
        ...initConfig,
        origin: calOrigin,
      });
      Cal("inline", {
        elementOrSelector: element,
        calLink,
        config: config ? { ...config } : undefined,
      });
    }
  }, [Cal, calLink, namespace, calOrigin, initConfig, configJson]);

  useEffect(() => {
    const CalApi = namespace ? Cal?.ns[namespace] : Cal;
    if (!CalApi || !initializedRef.current || lastConfigRef.current === configJson) {
      return;
    }

    lastConfigRef.current = configJson;
    CalApi("connect", {
      config: config ? { ...config } : {},
      params: {},
    });

    const uiConfig = {
      ...(config?.theme ? { theme: config.theme } : {}),
      ...(config?.layout ? { layout: config.layout } : {}),
    };

    if (Object.keys(uiConfig).length) {
      CalApi("ui", uiConfig);
    }
  }, [Cal, config, configJson, namespace]);

  if (!Cal) {
    return null;
  }

  return <div ref={ref} {...restProps} />;
};
export default Cal;
