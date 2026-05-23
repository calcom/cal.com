/// <reference types="../env" />

import {
  EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS,
  EMBED_MODAL_IFRAME_SLOT_STALE_TIME,
  EMBED_MODAL_PRERENDER_PREVENT_THRESHOLD_MS,
} from "./constants";
import css from "./embed.css?inline";
import type { InterfaceWithParent, interfaceWithParent } from "./embed-iframe";
import { FloatingButton } from "./FloatingButton/FloatingButton";
import { Inline } from "./Inline/inline";
import { getScrollableAncestor } from "./lib/domUtils";
import { getScrollByDistanceHandler } from "./lib/eventHandlers/scrollByDistanceEventHandler";
import {
  buildConfigWithPrerenderRelatedFields,
  fromEntriesWithDuplicateKeys,
  generateDataAttributes,
  getConfigProp,
  isRouterPath,
  isSameBookingLink,
} from "./lib/utils";
import { ModalBox } from "./ModalBox/ModalBox";
import type { EventData, EventDataMap } from "./sdk-action-manager";
import { SdkActionManager } from "./sdk-action-manager";
import tailwindCss from "./tailwindCss";
import type { EmbedPageType, ModalPrerenderOptions, PrefillAndIframeAttrsConfig, UiConfig } from "./types";
import { getMaxHeightForModal } from "./ui-utils";

// Exporting for consumption by @calcom/embed-core user
export type { EmbedEvent } from "./sdk-action-manager";
export type { PrefillAndIframeAttrsConfig } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rest<T extends any[] | undefined> = T extends [any, ...infer U] ? U : never;
export type Message = {
  originator: string;
  method: keyof InterfaceWithParent;
  arg: InterfaceWithParent[keyof InterfaceWithParent];
};
// HACK: Redefine and don't import WEBAPP_URL as it causes import statement to be present in built file.
// This is happening because we are not able to generate an App and a lib using single Vite Config.
const WEBAPP_URL = process.env.EMBED_PUBLIC_WEBAPP_URL || `https://${process.env.EMBED_PUBLIC_VERCEL_URL}`;

customElements.define("cal-modal-box", ModalBox);
customElements.define("cal-floating-button", FloatingButton);
customElements.define("cal-inline", Inline);

declare module "*.css";
type Namespace = string;
type CalConfig = {
  calOrigin: string;
  debug?: boolean;
  uiDebug?: boolean;
};

type ModalBoxElement = Element & {
  uid?: string;
};

type ModalStateData = {
  embedConfig: PrefillAndIframeAttrsConfigWithGuestAndColorScheme;
  previousEmbedConfig: PrefillAndIframeAttrsConfigWithGuestAndColorScheme | null;
  embedRenderStartTime: number;
  previousEmbedRenderStartTime: number | null;
  isConnectionInitiated: boolean;
  prerenderOptions: ModalPrerenderOptions | null;
};

type InitArgConfig = Partial<CalConfig> & {
  origin?: string;
};

type DoInIframeArg = {
  [K in keyof typeof interfaceWithParent]: {
    method: K;
    arg?: Parameters<(typeof interfaceWithParent)[K]>[0];
  };
}[keyof typeof interfaceWithParent];

const globalCal = window.Cal;
if (!globalCal || !globalCal.q) {
  throw new Error("Cal is not defined. This shouldn't happen");
}

initializeGlobalCalProps();

document.head.appendChild(document.createElement("style")).innerHTML = css;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ValidationSchemaPropType = string | Function;

type ValidationSchema = {
  required?: boolean;
  props?: Record<
    string,
    ValidationSchema & {
      type: ValidationSchemaPropType | ValidationSchemaPropType[];
    }
  >;
};
/**
 * //TODO: Warn about extra properties not part of schema. Helps in fixing wrong expectations
 * A very simple data validator written with intention of keeping payload size low.
 * Extend the functionality of it as required by the embed.
 * @param data
 * @param schema
 */
function validate(data: Record<string, unknown>, schema: ValidationSchema) {
  function checkType(value: unknown, expectedType: ValidationSchemaPropType) {
    if (typeof expectedType === "string") {
      return typeof value == expectedType;
    } else {
      return value instanceof expectedType;
    }
  }

  function isUndefined(data: unknown) {
    return typeof data === "undefined";
  }

  if (schema.required && isUndefined(data)) {
    throw new Error("Argument is required");
  }

  for (const [prop, propSchema] of Object.entries(schema.props || {})) {
    if (propSchema.required && isUndefined(data[prop])) {
      throw new Error(`"${prop}" is required`);
    }
    let typeCheck = true;
    if (propSchema.type && !isUndefined(data[prop])) {
      if (propSchema.type instanceof Array) {
        propSchema.type.forEach((type) => {
          typeCheck = typeCheck || checkType(data[prop], type);
        });
      } else {
        typeCheck = checkType(data[prop], propSchema.type);
      }
    }
    if (!typeCheck) {
      throw new Error(`"${prop}" is of wrong type.Expected type "${propSchema.type}"`);
    }
  }
}

function getColorScheme(el: Element) {
  const pageColorScheme = getComputedStyle(el).colorScheme;
  if (pageColorScheme === "dark" || pageColorScheme === "light") {
    return pageColorScheme;
  }
  return null;
}

function withColorScheme(
  config: PrefillAndIframeAttrsConfigWithGuest,
  containerEl: Element
): PrefillAndIframeAttrsConfigWithGuestAndColorScheme {
  if (!config["ui.color-scheme"]) {
    const colorScheme = getColorScheme(containerEl);
    if (colorScheme) {
      config["ui.color-scheme"] = colorScheme;
    }
  }
  return config;
}

type allPossibleCallbacksAndActions = {
  [K in keyof EventDataMap]: {
    action: K;
    callback: (arg0: CustomEvent<EventData<K>>) => void;
  };
}[keyof EventDataMap];

type SingleInstructionMap = {
  on: ["on", allPossibleCallbacksAndActions];
  off: ["off", allPossibleCallbacksAndActions];
} & {
  [K in Exclude<keyof CalApi, "on" | "off">]: CalApi[K] extends (...args: never[]) => void
    ? [K, ...Parameters<CalApi[K]>]
    : never;
};

type SingleInstruction = SingleInstructionMap[keyof SingleInstructionMap];

export type Instruction = SingleInstruction | SingleInstruction[];
export type InstructionQueue = Instruction[];

const excludeParam = (key: string, _value: unknown) => {
  const paramsReservedByBookingForm = [
    "month",
    "date",
    "slot",
    "rescheduleUid",
    "bookingUid",
    "duration",
    "overlayCalendar",
  ];

  const EXCLUDED_PARAMS = [...paramsReservedByBookingForm];

  if (EXCLUDED_PARAMS.includes(key)) return true;

  return false;
};

type PrefillAndIframeAttrsConfigWithGuest = PrefillAndIframeAttrsConfig & {
  guest?: string | string[];
};

type PrefillAndIframeAttrsConfigWithGuestAndColorScheme = PrefillAndIframeAttrsConfigWithGuest & {
  "ui.color-scheme"?: string | null;
};

export class Cal {
  iframe?: HTMLIFrameElement;

  __config: CalConfig;

  modalBox?: ModalBoxElement;

  inlineEl?: Element;

  namespace: string;

  actionManager: SdkActionManager;

  iframeReady!: boolean;

  iframeDoQueue: DoInIframeArg[] = [];

  api: CalApi;

  commandsPersistAcrossIframeResets: DoInIframeArg["method"][] = ["ui"];

  isPrerendering?: boolean;

  static actionsManagers: Record<Namespace, SdkActionManager>;
  calLink: string | null = null;
  embedConfig: PrefillAndIframeAttrsConfig | null = null;
  embedRenderStartTime: number | null = null;
  static ensureGuestKey(config: PrefillAndIframeAttrsConfig) {
    config = config || {};
    return {
      ...config,
      guest: config.guests ?? undefined,
    } as PrefillAndIframeAttrsConfigWithGuest;
  }

  processInstruction(instructionAsArgs: IArguments | Instruction) {
    const instruction: Instruction = [].slice.call(instructionAsArgs);
    if (typeof instruction[0] !== "string") {
      instruction.forEach((instruction) => {
        this.processInstruction(instruction);
      });
      return;
    }

    const [method, ...args] = instruction;
    if (!this.api[method]) {
      error(`Instruction ${method} not FOUND`);
    }
    try {
      // @ts-expect-error There can be any method which can have any number of arguments.
      this.api[method](...args);
    } catch (e) {
      error(`Instruction couldn't be executed`, e);
    }
    return instruction;
  }

  processQueue(queue: Queue) {
    queue.forEach((instruction) => {
      this.processInstruction(instruction);
    });

    queue.splice(0);

    // @ts-expect-error We changed the definition of push here.
    queue.push = (instruction) => {
      this.processInstruction(instruction);
    };
  }

  createIframe({
    calLink,
    config = {},
    calOrigin,
  }: {
    calLink: string;
    config?: PrefillAndIframeAttrsConfigWithGuestAndColorScheme;
    calOrigin: string | null;
  }) {
    const iframe = (this.iframe = document.createElement("iframe"));
    iframe.className = "cal-embed";
    iframe.name = `cal-embed=${this.namespace}`;
    iframe.title = `Book a call`;

    this.loadInIframe({ calLink, config, calOrigin, iframe });
    return iframe;
  }

  loadInIframe({
    calLink,
    config = {},
    calOrigin,
    iframe,
  }: {
    iframe: HTMLIFrameElement;
    calLink: string;
    config?: PrefillAndIframeAttrsConfig;
    calOrigin: string | null;
  }) {
    log("Loading in iframe", calLink, "with config", JSON.stringify(config));
    iframe.dataset.calLink = calLink;
    const calConfig = this.getCalConfig();
    const { iframeAttrs, ...queryParamsFromConfig } = config;

    if (iframeAttrs && iframeAttrs.id) {
      iframe.setAttribute("id", iframeAttrs.id);
    }

    iframe.setAttribute("allow", "payment");

    const searchParams = this.buildFilteredQueryParams(queryParamsFromConfig);

    const originToUse = (calOrigin || calConfig.calOrigin || "").replace(
      "https://cal.com",
      "https://app.cal.com"
    );

    const urlInstance = new URL(`${originToUse}/${calLink}`);
    if (!urlInstance.pathname.endsWith("embed")) {
      urlInstance.pathname = `${urlInstance.pathname}/embed`;
    }

    urlInstance.searchParams.set("embed", this.namespace);

    const pageParams = this.getQueryParamsFromPage();
    if (calConfig.debug || pageParams["cal.embed.logging"] === "1") {
      urlInstance.searchParams.set("debug", "true");
    }

    iframe.style.visibility = "hidden";

    if (calConfig.uiDebug) {
      iframe.style.border = "1px solid green";
    }

    searchParams.forEach((value, key) => {
      urlInstance.searchParams.append(key, value);
    });

    this.iframeReset();

    if (iframe.src === urlInstance.toString()) {
      urlInstance.searchParams.append("__cal.reloadTs", Date.now().toString());
    }

    iframe.src = urlInstance.toString();
    return iframe;
  }

  getCalConfig() {
    return this.__config;
  }

  doInIframe(doInIframeArg: DoInIframeArg) {
    if (!this.iframeReady) {
      this.iframeDoQueue.push(doInIframeArg);
      return;
    }
    if (!this.iframe) {
      throw new Error("iframe doesn't exist. `createIframe` must be called before `doInIframe`");
    }
    if (this.iframe.contentWindow) {
      // Derive targetOrigin from the iframe's src URL to avoid posting messages to arbitrary origins.
      // The iframe's origin is the cal.com instance (or self-hosted) that the embed is pointed at.
      const targetOrigin = this.iframe.src ? new URL(this.iframe.src).origin : "*";
      this.iframe.contentWindow.postMessage(
        { originator: "CAL", method: doInIframeArg.method, arg: doInIframeArg.arg },
        targetOrigin
      );
    }
  }

  resetQueue() {
    this.iframeDoQueue = this.iframeDoQueue.filter((doInIframeArg) =>
      this.commandsPersistAcrossIframeResets.includes(doInIframeArg.method)
    );
  }

  iframeReset() {
    this.iframeReady = false;
    this.resetQueue();
  }

  constructor(namespace: string, q: Queue) {
    this.__config = {
      calOrigin: WEBAPP_URL,
    };
    this.api = new CalApi(this);
    this.namespace = namespace;
    this.actionManager = new SdkActionManager(namespace);

    Cal.actionsManagers = Cal.actionsManagers || {};
    Cal.actionsManagers[namespace] = this.actionManager;

    this.processQueue(q);

    this.actionManager.on("__dimensionChanged", (e) => {
      const { data } = e.detail;
      const iframe = this.iframe;

      if (!iframe) {
        return;
      }
      const unit = "px";
      if (data.iframeHeight) {
        iframe.style.height = data.iframeHeight + unit;
      }

      if (this.modalBox) {
        iframe.style.maxHeight = `${getMaxHeightForModal()}px`;
      }
    });

    this.actionManager.on("__iframeReady", (e) => {
      this.iframeReady = true;
      if (this.iframe && !e.detail.data.isPrerendering) {
        this.iframe.style.visibility = "";
      }
      this.doInIframe({ method: "parentKnowsIframeReady" } as const);
      this.iframeDoQueue.forEach((doInIframeArg) => {
        this.doInIframe(doInIframeArg);
      });
      this.resetQueue();
    });

    this.actionManager.on("__routeChanged", () => {
      if (!this.inlineEl) {
        return;
      }
      const { top, height } = this.inlineEl.getBoundingClientRect();
      if (top < 0 && Math.abs(top / height) >= 0.25) {
        this.inlineEl.scrollIntoView({ behavior: "smooth" });
      }
    });

    this.actionManager.on("__scrollByDistance", getScrollByDistanceHandler(this));

    this.actionManager.on("linkReady", () => {
      if (this.isPrerendering) {
        return;
      }
      if (this.iframe) {
        this.iframe.style.visibility = "";
      }

      this.modalBox?.setAttribute("state", "loaded");
      this.inlineEl?.setAttribute("loading", "done");
    });

    this.actionManager.on("linkFailed", (e) => {
      const iframe = this.iframe;
      if (!iframe) {
        return;
      }
      if (this.isPrerendering) {
        return;
      }
      this.inlineEl?.setAttribute("data-error-code", e.detail.data.code);
      this.modalBox?.setAttribute("data-error-code", e.detail.data.code);
      this.inlineEl?.setAttribute("loading", "failed");
      this.modalBox?.setAttribute("state", "failed");
    });
  }

  scrollByDistance(distanceInPixels: number): void {
    if (!this.iframe) {
      return;
    }
    const scrollContainer = getScrollableAncestor(this.iframe);
    if (!scrollContainer) {
      return;
    }
    const newScrollTop = scrollContainer.scrollTop + distanceInPixels;

    scrollContainer.scrollTo({ top: newScrollTop, behavior: "smooth" });
  }

  private filterParams(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(params).filter(([key, value]) => !excludeParam(key, value)));
  }

  private getQueryParamsFromPage() {
    const queryParamsFromPage = getQueryParamsFromPage();
    return this.filterParams(queryParamsFromPage);
  }

  private buildFilteredQueryParams(queryParamsFromConfig: PrefillAndIframeAttrsConfig): URLSearchParams {
    const queryParamsFromPageUrl = globalCal.config?.forwardQueryParams ? this.getQueryParamsFromPage() : {};

    const mergedQueryParams = { ...queryParamsFromPageUrl, ...queryParamsFromConfig };

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(mergedQueryParams)) {
      if (value === undefined) {
        continue;
      }
      if (value instanceof Array) {
        value.forEach((val) => searchParams.append(key, val));
      } else {
        searchParams.set(key, value as string);
      }
    }

    return searchParams;
  }

  getNextActionForModal({
    modal,
    pathWithQueryToLoad,
    stateData,
  }: {
    modal: { uid: string };
    pathWithQueryToLoad: string;
    stateData: ModalStateData;
  }) {
    const {
      embedConfig,
      previousEmbedConfig,
      isConnectionInitiated,
      previousEmbedRenderStartTime,
      embedRenderStartTime,
      prerenderOptions,
    } = stateData;
    const calConfig = this.getCalConfig();
    const lastLoadedUrlInIframeObject = this.getLastLoadedLinkInframe();
    const lastLoadedPathInIframe = lastLoadedUrlInIframeObject?.pathname ?? null;
    const urlToLoadObject = new URL(pathWithQueryToLoad, calConfig.calOrigin as string);

    const existingModalEl = document.querySelector(`cal-modal-box[uid="${modal.uid}"]`);
    const urlToLoadPath = urlToLoadObject.pathname;
    const isSameCalLink =
      lastLoadedPathInIframe &&
      isSameBookingLink({
        bookingLinkPath1: lastLoadedPathInIframe,
        bookingLinkPath2: urlToLoadPath,
      });

    const lastLoadedUrlInIframeObjectSearchParams = lastLoadedUrlInIframeObject?.searchParams.toString();
    const urlToLoadObjectSearchParams = urlToLoadObject.searchParams.toString();

    const areSameQueryParams = lastLoadedUrlInIframeObjectSearchParams === urlToLoadObjectSearchParams;

    const isSameConfig =
      previousEmbedConfig &&
      isSameEmbedConfig({
        embedConfig1: previousEmbedConfig,
        embedConfig2: embedConfig,
      });
    const isInFailedState = existingModalEl && existingModalEl.getAttribute("state") === "failed";

    const timeSinceLastRender = previousEmbedRenderStartTime
      ? embedRenderStartTime - previousEmbedRenderStartTime
      : 0;
    const crossedReloadThreshold = previousEmbedRenderStartTime
      ? timeSinceLastRender >
        (prerenderOptions?.iframeForceReloadThresholdMs ?? EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS)
      : false;

    const areSlotsStale = previousEmbedRenderStartTime
      ? timeSinceLastRender > (prerenderOptions?.slotsStaleTimeMs ?? EMBED_MODAL_IFRAME_SLOT_STALE_TIME)
      : false;

    const isResetNeeded = !isSameCalLink || isInFailedState || crossedReloadThreshold;

    const getActionToTake = () => {
      if (isResetNeeded) {
        return "fullReload";
      }

      if (prerenderOptions?.backgroundSlotsFetch && !areSlotsStale) {
        return "connect-no-slots-fetch";
      }

      if (!isSameConfig || !areSameQueryParams || !isConnectionInitiated || areSlotsStale) {
        return "connect";
      }
      return "noAction";
    };

    const actionToTake = getActionToTake();

    log(
      "Next Modal Action:",
      { actionToTake, prerenderOptions },
      {
        path: {
          isSame: isSameCalLink,
          urlToLoadPath,
          lastLoadedPathInIframe,
        },
        config: {
          isSame: isSameConfig,
          previousEmbedConfig,
          embedConfig,
        },
        queryParams: {
          isSame: areSameQueryParams,
          lastLoadedUrlInIframeObjectSearchParams,
          urlToLoadObjectSearchParams,
        },
        areSlotsStale,
        crossedReloadThreshold,
        isInFailedState,
        isConnectionInitiated,
      }
    );

    return actionToTake;

    function isSameEmbedConfig({
      embedConfig1,
      embedConfig2,
    }: {
      embedConfig1: PrefillAndIframeAttrsConfig;
      embedConfig2: PrefillAndIframeAttrsConfig;
    }) {
      if (Object.keys(embedConfig1).length !== Object.keys(embedConfig2).length) {
        return false;
      }
      return Object.keys(embedConfig1).every((key) => {
        if (typeof embedConfig1[key] !== typeof embedConfig2[key]) {
          return false;
        }
        const embedConfig1Value = embedConfig1[key];
        const embedConfig2Value = embedConfig2[key];
        if (embedConfig1Value instanceof Array && embedConfig2Value instanceof Array) {
          return (
            embedConfig1Value.length === embedConfig2Value.length &&
            embedConfig1Value.every((value: string) => embedConfig2Value.includes(value))
          );
        }
        if (typeof embedConfig1Value === "string") {
          return embedConfig1Value === embedConfig2Value;
        }
        return true;
      });
    }
  }

  getLastLoadedLinkInframe() {
    if (!this.iframe || !this.iframe.dataset.calLink) {
      return null;
    }
    const calLink = this.iframe.dataset.calLink;
    if (!calLink) {
      return null;
    }
    const urlObject = new URL(calLink, new URL(this.iframe.src).origin);
    return new URL(`${urlObject.pathname}${urlObject.search}`, urlObject.origin);
  }

  recordUpdatedParamsForIframe(params: Record<string, string | string[]>) {
    const lastLoadedUrlInIframeObject = this.getLastLoadedLinkInframe();
    if (!lastLoadedUrlInIframeObject || !this.iframe) {
      return;
    }
    const urlObject = new URL(lastLoadedUrlInIframeObject.toString());
    for (const [key, value] of Object.entries(params)) {
      urlObject.searchParams.set(key, value as string);
    }
    this.iframe.dataset.calLink = `${urlObject.pathname.replace(/^\//, "")}${urlObject.search}`;
  }

  canPrerenderLink({
    calLink,
    calOrigin,
    previousEmbedRenderStartTime,
  }: {
    calLink: string;
    calOrigin: string;
    previousEmbedRenderStartTime: number | null;
  }) {
    const lastLoadedUrlInIframeObject = this.getLastLoadedLinkInframe();
    if (lastLoadedUrlInIframeObject?.toString() === new URL(calLink, calOrigin).toString()) {
      const isThresholdCrossed = hasCrossedThreshold();
      if (isThresholdCrossed) {
        log("Threshold crossed, allowing repeat prerender");
        return true;
      }
      log("Threshold not crossed, preventing repeat prerender");
      return false;
    }
    return true;

    function hasCrossedThreshold() {
      if (!previousEmbedRenderStartTime) {
        return false;
      }
      const timeDiff = Date.now() - previousEmbedRenderStartTime;
      if (timeDiff >= EMBED_MODAL_PRERENDER_PREVENT_THRESHOLD_MS) {
        return true;
      }
      return false;
    }
  }

  prepareForPrerender({
    calLink,
    calOrigin,
    previousEmbedRenderStartTime,
    prerenderOptions,
    isHeadlessRouterPath,
  }: {
    calLink: string;
    calOrigin: string;
    previousEmbedRenderStartTime: number | null;
    prerenderOptions: ModalPrerenderOptions;
    isHeadlessRouterPath: boolean;
  }) {
    if (!this.canPrerenderLink({ calLink, calOrigin, previousEmbedRenderStartTime })) {
      return null;
    }

    if (this.modalBox) {
      log("Destroying previous prerendered modalbox");
      this.modalBox.remove();
    }

    const DEFAULT_BACKGROUND_SLOTS_FETCH = isHeadlessRouterPath ? true : false;

    const backgroundSlotsFetch =
      typeof prerenderOptions.backgroundSlotsFetch === "undefined"
        ? DEFAULT_BACKGROUND_SLOTS_FETCH
        : prerenderOptions.backgroundSlotsFetch;
    const enrichedPrerenderOptions = { ...prerenderOptions, backgroundSlotsFetch };

    this.api.prerenderOptions = enrichedPrerenderOptions;
    this.isPrerendering = true;

    return { enrichedPrerenderOptions };
  }

  setModalRenderStartVariables({
    embedConfig,
    embedRenderStartTime,
  }: {
    embedConfig: PrefillAndIframeAttrsConfig;
    embedRenderStartTime: number;
  }) {
    this.embedConfig = embedConfig;
    this.embedRenderStartTime = embedRenderStartTime;
  }

  getPreviousModalRenderStartVariables() {
    return {
      embedConfig: this.embedConfig,
      embedRenderStartTime: this.embedRenderStartTime,
    };
  }

  connect({
    config,
    params,
  }: {
    config: PrefillAndIframeAttrsConfig;
    params: Record<string, string | string[]>;
  }) {
    this.recordUpdatedParamsForIframe(params);
    this.doInIframe({
      method: "connect",
      arg: {
        config,
        params,
      },
    });
  }
}

class CalApi {
  cal: Cal;
  static initializedNamespaces = [] as string[];
  modalUid?: string;
  prerenderedModalUid?: string;
  prerenderOptions?: ModalPrerenderOptions;
  constructor(cal: Cal) {
    this.cal = cal;
  }

  init(namespaceOrConfig?: string | InitArgConfig, config = {} as InitArgConfig) {
    let initForNamespace = "";
    if (typeof namespaceOrConfig !== "string") {
      config = (namespaceOrConfig || {}) as CalConfig;
    } else {
      initForNamespace = namespaceOrConfig;
    }

    if (initForNamespace !== this.cal.namespace) {
      return;
    }

    CalApi.initializedNamespaces.push(this.cal.namespace);

    const { calOrigin, origin, ...restConfig } = config;

    this.cal.__config.calOrigin = calOrigin || origin || this.cal.__config.calOrigin;

    this.cal.__config = { ...this.cal.__config, ...restConfig };
  }

  initNamespace(namespace: string) {
    globalCal.ns[namespace].instance =
      globalCal.ns[namespace].instance || new Cal(namespace, globalCal.ns[namespace].q);
  }

  inline({
    calLink,
    elementOrSelector,
    config,
  }: {
    calLink: string;
    elementOrSelector: string | HTMLElement;
    config?: PrefillAndIframeAttrsConfig;
  }) {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0], {
      required: true,
      props: {
        calLink: {
          required: true,
          type: "string",
        },
        elementOrSelector: {
          required: true,
          type: ["string", HTMLElement],
        },
        config: {
          required: false,
          type: Object,
        },
      },
    });

    if (this.cal.inlineEl && document.body.contains(this.cal.inlineEl)) {
      console.warn("Inline embed already exists. Ignoring this call");
      return;
    }

    config = config || {};
    if (typeof config.iframeAttrs === "string" || config.iframeAttrs instanceof Array) {
      throw new Error("iframeAttrs should be an object");
    }
    const containerEl =
      elementOrSelector instanceof HTMLElement
        ? elementOrSelector
        : document.querySelector(elementOrSelector);

    if (!containerEl) {
      throw new Error("Element not found");
    }

    config.embedType = "inline";
    const calConfig = this.cal.getCalConfig();

    const iframe = this.cal.createIframe({
      calLink,
      config: withColorScheme(Cal.ensureGuestKey(config), containerEl),
      calOrigin: calConfig.calOrigin,
    });

    iframe.style.height = "100%";
    iframe.style.width = "100%";

    containerEl.classList.add("cal-inline-container");

    const template = document.createElement("template");
    const layout = getConfigProp(config, "layout");
    const pageType = getConfigProp(config, "cal.embed.pageType");
    const theme = getConfigProp(config, "theme");

    template.innerHTML = `<cal-inline 
      ${generateDataAttributes({
        pageType,
        theme,
        layout,
      })}
      style="max-height:inherit;height:inherit;min-height:inherit;display:flex;position:relative;flex-wrap:wrap;width:100%">
    </cal-inline>
    <style>.cal-inline-container::-webkit-scrollbar{display:none}.cal-inline-container{scrollbar-width:none}</style>`;
    this.cal.inlineEl = template.content.children[0];
    this.cal.inlineEl.appendChild(iframe);
    containerEl.appendChild(template.content);
  }

  floatingButton({
    calLink,
    buttonText = "Book my Cal",
    hideButtonIcon = false,
    attributes,
    buttonPosition = "bottom-right",
    buttonColor = "rgb(0, 0, 0)",
    buttonTextColor = "rgb(255, 255, 255)",
    calOrigin,
    config,
  }: {
    calLink: string;
    buttonText?: string;
    attributes?: Record<"id", string> & Record<string | "id", string>;
    hideButtonIcon?: boolean;
    buttonPosition?: "bottom-left" | "bottom-right";
    buttonColor?: string;
    buttonTextColor?: string;
    calOrigin?: string;
    config?: PrefillAndIframeAttrsConfig;
  }) {
    let existingEl: HTMLElement | null = null;

    if (attributes?.id) {
      existingEl = document.getElementById(attributes.id);
    }
    let el: FloatingButton;
    if (!existingEl) {
      el = document.createElement("cal-floating-button") as FloatingButton;
      el.dataset.calLink = calLink;
      el.dataset.calNamespace = this.cal.namespace;
      el.dataset.calOrigin = calOrigin ?? "";
      if (config) {
        el.dataset.calConfig = JSON.stringify(config);
      }

      if (attributes?.id) {
        el.id = attributes.id;
      }

      document.body.appendChild(el);
    } else {
      el = existingEl as FloatingButton;
    }
    const dataset = el.dataset;
    dataset.buttonText = buttonText;
    dataset.hideButtonIcon = `${hideButtonIcon}`;
    dataset.buttonPosition = `${buttonPosition}`;
    dataset.buttonColor = `${buttonColor}`;
    dataset.buttonTextColor = `${buttonTextColor}`;
  }

  async modal({
    calLink,
    config = {},
    calOrigin,
    __prerender = false,
    prerenderOptions = {},
  }: {
    calLink: string;
    config?: PrefillAndIframeAttrsConfig;
    calOrigin?: string;
    __prerender?: boolean;
    prerenderOptions?: ModalPrerenderOptions;
  }) {
    const isPrerendering = !!__prerender;
    if (typeof config.iframeAttrs === "string" || config.iframeAttrs instanceof Array) {
      throw new Error("iframeAttrs should be an object");
    }
    const containerEl = document.body;
    const calConfig = this.cal.getCalConfig();
    config = { ...config };

    calOrigin = calOrigin || calConfig.calOrigin;

    const calLinkUrlObject = new URL(calLink, calOrigin);
    const isHeadlessRouterPath = calLinkUrlObject ? isRouterPath(calLinkUrlObject.toString()) : false;
    const { embedConfig: previousEmbedConfig, embedRenderStartTime: previousEmbedRenderStartTime } =
      this.cal.getPreviousModalRenderStartVariables();

    let enrichedConfig: PrefillAndIframeAttrsConfig;
    const configWithGuestKeyAndColorScheme = withColorScheme(
      Cal.ensureGuestKey({
        ...config,
        embedType: "modal",
      }),
      containerEl
    );

    let enrichedPrerenderOptions: ModalPrerenderOptions | undefined;
    if (isPrerendering) {
      const preparationResult = this.cal.prepareForPrerender({
        calLink,
        calOrigin,
        previousEmbedRenderStartTime,
        prerenderOptions,
        isHeadlessRouterPath,
      });

      if (!preparationResult) {
        log(`Prevented unnecessary repeat prerender for ${calLink}`);
        return {
          status: "prerender-prevented",
        };
      }

      enrichedPrerenderOptions = preparationResult.enrichedPrerenderOptions;
      enrichedConfig = buildConfigWithPrerenderRelatedFields({
        config: configWithGuestKeyAndColorScheme,
        isHeadlessRouterPath,
        backgroundSlotsFetch: !!this.prerenderOptions?.backgroundSlotsFetch,
      });
    } else {
      this.cal.isPrerendering = false;
      enrichedConfig = configWithGuestKeyAndColorScheme;
    }

    const reusableModalUid = this.modalUid || this.prerenderedModalUid;
    const uid = reusableModalUid || String(Date.now());
    const isConnectionInitiated = !!(this.modalUid && this.prerenderedModalUid);
    const embedRenderStartTime = Date.now();

    const stateData = {
      embedConfig: enrichedConfig,
      previousEmbedConfig,
      embedRenderStartTime,
      previousEmbedRenderStartTime,
      isConnectionInitiated,
      prerenderOptions: enrichedPrerenderOptions ?? this.prerenderOptions ?? null,
    };

    this.cal.setModalRenderStartVariables({
      embedConfig: enrichedConfig,
      embedRenderStartTime,
    });

    return this.__modal({
      calLink,
      enrichedConfig,
      calOrigin,
      isPrerendering,
      stateData,
      uid,
      containerEl,
    });
  }

  async __modal({
    uid,
    calLink,
    enrichedConfig,
    calOrigin,
    isPrerendering,
    stateData,
    containerEl,
  }: {
    uid: string;
    calLink: string;
    enrichedConfig: PrefillAndIframeAttrsConfig;
    calOrigin: string;
    isPrerendering: boolean;
    stateData: ModalStateData;
    containerEl: HTMLElement;
  }) {
    const calLinkUrlObject = new URL(calLink, calOrigin);
    const isHeadlessRouterPath = calLinkUrlObject ? isRouterPath(calLinkUrlObject.toString()) : false;

    const existingModalEl = document.querySelector(`cal-modal-box[uid="${uid}"]`);
    if (!!existingModalEl && !!this.cal.iframe) {
      log(`Trying to reuse modal ${uid}`);
      const lastLoadedUrlObject = this.cal.getLastLoadedLinkInframe();
      const lastLoadedPathIsRouter = lastLoadedUrlObject?.pathname?.includes("/router");

      if (isHeadlessRouterPath && !lastLoadedPathIsRouter) {
        throw new Error(
          "`prerender` instruction should have been fired with headless router path as calLink(i.e. router?form={FORM_ID}&PARAMS=VALUES)"
        );
      } else {
        const actionToTake = this.cal.getNextActionForModal({
          modal: { uid },
          pathWithQueryToLoad: `${calLinkUrlObject.pathname}${calLinkUrlObject.search}`,
          stateData,
        });

        if (actionToTake === "noAction") {
          if (isPrerendering) {
            return;
          }
          log(`Reopening modal without any other action needed ${uid}`);
          existingModalEl.setAttribute("state", "reopened");
          return;
        }

        log("Attempting to load/connect regular booking link");
        existingModalEl.setAttribute("state", "loading");

        if (actionToTake === "fullReload") {
          log("Initiating full page load");
          this.cal.loadInIframe({
            calLink,
            calOrigin,
            iframe: this.cal.iframe,
            config: enrichedConfig,
          });
          this.cal.doInIframe({ method: "__reloadInitiated", arg: {} });
        } else if (actionToTake === "connect" || actionToTake === "connect-no-slots-fetch") {
          const paramsToAdd = fromEntriesWithDuplicateKeys(calLinkUrlObject.searchParams.entries());
          this.cal.connect({
            config: {
              ...enrichedConfig,
              ...(actionToTake === "connect-no-slots-fetch"
                ? {
                    "cal.embed.noSlotsFetchOnConnect": "true",
                  }
                : {}),
            },
            params: paramsToAdd,
          });
        }
      }

      this.modalUid = uid;
      return;
    }

    log(`Creating new modal ${uid}`);

    if (isPrerendering) {
      this.prerenderedModalUid = uid;
    } else {
      // this.modalUid = uid;
    }

    let iframe = null;

    if (!iframe) {
      iframe = this.cal.createIframe({
        calLink,
        config: enrichedConfig,
        calOrigin,
      });
    }

    iframe.style.borderRadius = "8px";
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    const template = document.createElement("template");
    const pageType = getConfigProp(enrichedConfig, "cal.embed.pageType");
    const theme = getConfigProp(enrichedConfig, "theme");
    const layout = getConfigProp(enrichedConfig, "layout");

    template.innerHTML = `<cal-modal-box 
      ${generateDataAttributes({
        pageType,
        theme,
        layout,
      })}
      uid="${uid}">
    </cal-modal-box>`;
    this.cal.modalBox = template.content.children[0];
    this.cal.modalBox.appendChild(iframe);
    this.cal.modalBox.setAttribute("state", "loading");

    if (isPrerendering) {
      this.cal.modalBox.setAttribute("state", "prerendering");
    }
    this.handleClose();
    containerEl.appendChild(template.content);
    return {
      status: "created",
    };
  }

  private handleClose() {
    this.cal.actionManager.on("__closeIframe", () => {
      this.cal.modalBox?.setAttribute("state", "closed");
    });
  }

  on<T extends keyof EventDataMap>({
    action,
    callback,
  }: {
    action: T;
    callback: (arg0: CustomEvent<EventData<T>>) => void;
  }) {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0], {
      required: true,
      props: {
        action: {
          required: true,
          type: "string",
        },
        callback: {
          required: true,
          type: Function,
        },
      },
    });
    this.cal.actionManager.on(action, callback);
  }

  off<T extends keyof EventDataMap>({
    action,
    callback,
  }: {
    action: T;
    callback: (arg0: CustomEvent<EventData<T>>) => void;
  }) {
    this.cal.actionManager.off(action, callback);
  }

  closeModal() {
    if (this.cal.inlineEl && !this.cal.modalBox) {
      throw new Error(
        "closeModal() is only supported for modal-based embeds (ModalBox and FloatingButton). It cannot be used with inline embeds."
      );
    }
    this.cal.actionManager.fire("__closeIframe", {});
  }

  preload({
    calLink,
    type,
    options = {},
    pageType,
    calOrigin,
  }: {
    calLink: string;
    type?: "modal" | "floatingButton";
    options?: {
      prerenderIframe?: boolean;
      slotsStaleTimeMs?: number;
      iframeForceReloadThresholdMs?: number;
    };
    pageType?: EmbedPageType;
    calOrigin?: string;
  }) {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0], {
      required: true,
      props: {
        calLink: {
          type: "string",
          required: true,
        },
        type: {
          type: "string",
          required: false,
        },
        options: {
          type: Object,
          required: false,
        },
      },
    });
    let api: GlobalCalWithoutNs = globalCal;
    const namespace = this.cal.namespace;
    if (namespace) {
      api = globalCal.ns[namespace];
    }

    if (!api) {
      throw new Error(`Namespace ${namespace} isn't defined`);
    }

    const config = this.cal.getCalConfig();
    const { prerenderIframe: prerenderIframeOption, ...prerenderOptions } = options;
    let prerenderIframe = prerenderIframeOption;
    if (type && prerenderIframe === undefined) {
      prerenderIframe = true;
    }

    if (!type && prerenderIframe) {
      throw new Error("You should provide 'type'");
    }

    if (prerenderIframe) {
      if (type === "modal" || type === "floatingButton") {
        this.cal.isPrerendering = true;
        this.modal({
          calLink,
          calOrigin: calOrigin || config.calOrigin,
          __prerender: true,
          prerenderOptions,
          ...(pageType ? { config: { "cal.embed.pageType": pageType } } : {}),
        });
      } else {
        console.warn("Ignoring - full preload for inline embed and instead preloading assets only");
        preloadAssetsForCalLink({ calLink, config });
      }
    } else {
      preloadAssetsForCalLink({ calLink, config });
    }
  }

  prerender({
    calLink,
    type,
    pageType,
    calOrigin,
    options = {},
  }: {
    calLink: string;
    type: "modal" | "floatingButton";
    pageType?: EmbedPageType;
    calOrigin?: string;
    options?: {
      slotsStaleTimeMs?: number;
      iframeForceReloadThresholdMs?: number;
    };
  }) {
    this.preload({
      calLink,
      type,
      pageType,
      calOrigin,
      options,
    });
  }

  ui(uiConfig: UiConfig) {
    validate(uiConfig, {
      required: true,
      props: {
        theme: {
          required: false,
          type: "string",
        },
        styles: {
          required: false,
          type: Object,
        },
      },
    });

    this.cal.doInIframe({ method: "ui", arg: uiConfig });
  }
}

function getQueryParamsFromPage() {
  const params = new URLSearchParams(window.location.search);
  return fromEntriesWithDuplicateKeys(params.entries());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Queue = any[];
type GlobalConfig = {
  forwardQueryParams?: boolean;
};

type KeyOfSingleInstructionMap = keyof SingleInstructionMap;
export interface GlobalCalWithoutNs {
  <T extends KeyOfSingleInstructionMap>(methodName: T, ...arg: Rest<SingleInstructionMap[T]>): void;
  loaded?: boolean;
  q: Queue;
  instance?: Cal;
  __css?: string;
  fingerprint?: string;
  version?: string;
  __logQueue?: unknown[];
  config?: GlobalConfig;
}

type GlobalCalWithNs = GlobalCalWithoutNs & {
  ns: Record<string, GlobalCalWithoutNs>;
};

export type GlobalCal = GlobalCalWithNs;

declare global {
  interface Window {
    Cal: GlobalCal;
  }
}

export interface CalWindow extends Window {
  Cal: GlobalCal;
}

const DEFAULT_NAMESPACE = "";

globalCal.instance = new Cal(DEFAULT_NAMESPACE, globalCal.q);

for (const [ns, api] of Object.entries(globalCal.ns)) {
  api.instance = api.instance ?? new Cal(ns, api.q);
}

/**
 * Intercepts all postmessages and fires action in corresponding actionManager
 */
window.addEventListener("message", (e) => {
  const detail = e.data;
  const fullType = detail.fullType;
  const parsedAction = SdkActionManager.parseAction(fullType);
  if (!parsedAction) {
    return;
  }

  const actionManager = Cal.actionsManagers[parsedAction.ns];

  // Validate message origin against the expected cal instance origin.
  // Each Cal namespace has a configured calOrigin (the embedded app URL).
  // Messages must come from that origin to prevent cross-origin attacks.
  if (actionManager) {
    const calInstance = globalCal.ns?.[parsedAction.ns]?.instance;
    const expectedOrigin = calInstance?.__config?.calOrigin;
    if (expectedOrigin) {
      const expectedOriginUrl = new URL(expectedOrigin);
      if (e.origin !== expectedOriginUrl.origin) {
        console.warn(
          `Cal.com Embed: Rejected message from origin "${e.origin}" (expected "${expectedOriginUrl.origin}").`
        );
        return;
      }
    }
  }

  globalCal.__logQueue = globalCal.__logQueue || [];
  globalCal.__logQueue.push({ ...parsedAction, data: detail.data });

  if (!actionManager) {
    throw new Error(`Unhandled Action ${parsedAction}`);
  }
  // @ts-expect-error
  actionManager.fire(parsedAction.type, detail.data);
});

document.addEventListener("click", (e) => {
  const targetEl = e.target;

  const calLinkEl = getCalLinkEl(targetEl);
  const path = calLinkEl?.dataset?.calLink;
  if (!path) {
    return;
  }

  const namespace = calLinkEl.dataset.calNamespace;
  const configString = calLinkEl.dataset.calConfig || "";
  const calOrigin = calLinkEl.dataset.calOrigin || "";
  let config: PrefillAndIframeAttrsConfig;
  try {
    config = JSON.parse(configString);
  } catch {
    config = {};
  }

  let api: GlobalCalWithoutNs = globalCal;

  if (namespace) {
    api = globalCal.ns[namespace];
  }

  if (!api) {
    throw new Error(`Namespace ${namespace} isn't defined`);
  }

  api("modal", {
    calLink: path,
    config,
    calOrigin,
  });

  function getCalLinkEl(target: EventTarget | null) {
    let calLinkEl: HTMLElement | Element | undefined;
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    if (target?.dataset.calLink) {
      calLinkEl = target;
    } else {
      calLinkEl = Array.from(document.querySelectorAll("[data-cal-link]")).find((el) => el.contains(target));
    }

    if (!(calLinkEl instanceof HTMLElement)) {
      return null;
    }

    return calLinkEl;
  }
});

let currentColorScheme: string | null = null;

(function watchAndActOnColorSchemeChange() {
  setInterval(() => {
    const colorScheme = getColorScheme(document.body);
    if (colorScheme && colorScheme !== currentColorScheme) {
      currentColorScheme = colorScheme;
      CalApi.initializedNamespaces.forEach((ns) => {
        const api = getEmbedApiFn(ns);
        api("ui", {
          colorScheme: colorScheme,
        });
      });
    }
  }, 50);
})();

function getEmbedApiFn(ns: string) {
  let api: GlobalCalWithoutNs | GlobalCal;
  if (ns === DEFAULT_NAMESPACE) {
    api = globalCal;
  } else {
    api = globalCal.ns[ns];
  }
  return api;
}

function preloadAssetsForCalLink({ config, calLink }: { config: CalConfig; calLink: string }) {
  const iframe = document.body.appendChild(document.createElement("iframe"));

  const urlInstance = new URL(`${config.calOrigin}/${calLink}`);
  urlInstance.searchParams.set("preload", "true");
  iframe.src = urlInstance.toString();
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.display = "none";
}

function initializeGlobalCalProps() {
  globalCal.fingerprint = process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT as string;
  globalCal.version = process.env.EMBED_PUBLIC_EMBED_VERSION as string;
  globalCal.__css = tailwindCss;

  if (!globalCal.config) {
    globalCal.config = {};
  }

  globalCal.config.forwardQueryParams = globalCal.config.forwardQueryParams ?? false;
}

function log(...args: unknown[]) {
  const searchString = location.search;
  globalCal.__logQueue = globalCal.__logQueue || [];
  globalCal.__logQueue.push(args);
  if (searchString.includes("cal.embed.logging=1") || process.env.INTEGRATION_TEST_MODE === "true") {
    console.log("Parent:", ...args);
  }
}

function error(...args: unknown[]) {
  console.error(...args);
}
