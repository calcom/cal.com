"use client";

import type { PrefillAndIframeAttrsConfig } from "@calid/embed-runtime";
import { useEffect, useRef } from "react";

import { useCalLoader } from "./use-cal";

type CalProps = {
  calLink: string;
  calOrigin?: string;
  namespace?: string;
  config?: PrefillAndIframeAttrsConfig;
  initConfig?: { debug?: boolean; uiDebug?: boolean };
  embedJsUrl?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function Cal(props: CalProps) {
  const { calLink, calOrigin, namespace = "", config, initConfig = {}, embedJsUrl, ...rest } = props;

  if (!calLink) throw new Error("calLink is required");

  const did = useRef(false);
  const el = useRef<HTMLDivElement>(null);
  const root = useCalLoader(embedJsUrl);

  useEffect(() => {
    if (!root || did.current || !el.current) return;
    did.current = true;

    if (namespace) {
      root("init", namespace, { ...initConfig, origin: calOrigin });
      root.ns[namespace]("inline", { elementOrSelector: el.current, calLink, config });
    } else {
      root("init", { ...initConfig, origin: calOrigin });
      root("inline", { elementOrSelector: el.current, calLink, config });
    }
  }, [root, calLink, config, namespace, calOrigin, initConfig]);

  if (!root) return null;

  return <div ref={el} {...rest} />;
}

export default Cal;
