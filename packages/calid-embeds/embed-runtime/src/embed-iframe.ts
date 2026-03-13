"use client";

import "./sdk-event";
import { initFrameBridge, frameActions } from "./iframe/bridge";
import type { UiOptions, EmbedConfig, BookerEmbedState, SlotQueryStatus } from "./types/shared";

export {
  useEmbedTheme,
  useEmbedUiConfig,
  useEmbedStyles,
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useBrandColors,
  useIsEmbed,
  useEmbedType,
} from "./hooks/embed-hooks";

export {
  frameActions as methods,
  computeBookerEmbedState as getEmbedBookerState,
  syncBookerState as updateEmbedBookerState,
  checkFrameReady as isLinkReady,
  recordQueuedResponse as recordResponseIfQueued,
  initFrameBridge,
} from "./iframe/bridge";

export { iframeState as embedStore } from "./iframe/state-store";

initFrameBridge();

export type {
  UiOptions as UiConfig,
  EmbedConfig as PrefillAndIframeAttrsConfig,
  BookerEmbedState as EmbedBookerState,
  SlotQueryStatus as SlotsQuery,
};

export type InterfaceWithParent = {
  ui: (arg: UiOptions) => void;
  parentKnowsIframeReady: (arg: unknown) => void;
  connect: (arg: { config: EmbedConfig; params: Record<string, string | string[]> }) => void;
};

export const interfaceWithParent: InterfaceWithParent = frameActions as unknown as InterfaceWithParent;

export type Message = {
  originator: string;
  method: keyof InterfaceWithParent;
  arg: InterfaceWithParent[keyof InterfaceWithParent];
};
