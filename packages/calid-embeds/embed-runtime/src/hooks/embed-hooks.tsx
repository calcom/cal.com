"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { StylesMap, NonStyleConfig, UiOptions, ThemeOption } from "../types/shared";
import { iframeState } from "../iframe/state-store";
import { registerStyleSetter, resolveNs, resolveEmbedKind, getFrameBus } from "../iframe/bridge";
import { useCompatSearchParams } from "./useCompatSearchParams";

const isBrowser = typeof window !== "undefined";

function useRouteTracker(onChange: (url: string) => void): void {
  const pageUrl = isBrowser ? new URL(document.URL) : null;
  const path = pageUrl?.pathname ?? "";
  const query = pageUrl?.searchParams ?? null;
  const lastSeen = useRef(`${path}?${query}`);

  useEffect(() => {
    const current = `${path}?${query}`;
    if (lastSeen.current !== current) {
      lastSeen.current = current;
      onChange(current);
    }
  }, [path, query, onChange]);
}

export const useEmbedTheme = () => {
  const searchParams = useCompatSearchParams();
  const [theme, setTheme] = useState(
    iframeState.activeTheme || (searchParams?.get("theme") as typeof iframeState.activeTheme)
  );

  const onRoute = useCallback(() => getFrameBus()?.publish("__routeChanged", {}), []);
  useRouteTracker(onRoute);

  iframeState.applyTheme = setTheme as any;
  return theme;
};

export const useEmbedUiConfig = () => {
  const [config, setConfig] = useState(iframeState.uiState || {});
  iframeState.uiSetters.push(setConfig);

  useEffect(() => {
    return () => {
      const idx = iframeState.uiSetters.indexOf(setConfig);
      if (idx !== -1) iframeState.uiSetters.splice(idx, 1);
    };
  });

  return config;
};

export const useEmbedStyles = (key: keyof StylesMap) => {
  const [, setStyles] = useState<StylesMap>({});
  useEffect(() => registerStyleSetter({ key, setter: setStyles, isStyle: true }), []);
  return (iframeState.styleMap || {})[key] || {};
};

export const useEmbedNonStylesConfig = (key: keyof NonStyleConfig) => {
  const [, setConfig] = useState({} as NonStyleConfig);
  useEffect(() => registerStyleSetter({ key, setter: setConfig as any, isStyle: false }), []);
  return (iframeState.nonStyleMap || {})[key] || {};
};

export const useIsBackgroundTransparent = () => {
  const bodyStyle = useEmbedStyles("body");
  return bodyStyle.background === "transparent";
};

export const useBrandColors = () => {
  return (useEmbedNonStylesConfig("branding") as NonStyleConfig["branding"]) || {};
};

export const useIsEmbed = (ssrEmbed?: boolean) => {
  const [isEmbed, setIsEmbed] = useState(ssrEmbed);

  useEffect(() => {
    const ns = resolveNs();
    if (parent !== window && !ns) console.log("iframed without embed snippet");
    setIsEmbed(window?.isEmbed?.() || false);
  }, []);

  return isEmbed;
};

export const useEmbedType = () => {
  const [kind, setKind] = useState<string | null | undefined>(null);
  useEffect(() => { setKind(resolveEmbedKind()); }, []);
  return kind;
};

