/// <reference types="../env" />
import { FloatingButton } from "./FloatingButton/FloatingButton";
import { Inline } from "./Inline/inline";
import { ModalBox } from "./ModalBox/ModalBox";
import { addAppCssVars } from "./addAppCssVars";
import {
  EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS,
  EMBED_MODAL_IFRAME_SLOT_STALE_TIME,
} from "./constants";
import type { InterfaceWithParent, interfaceWithParent } from "./embed-iframe";
import css from "./embed.css";
import { SdkActionManager } from "./sdk-action-manager";
import type { EventData, EventDataMap } from "./sdk-action-manager";
import tailwindCss from "./tailwindCss";
import type { UiConfig, EmbedPageType, PrefillAndIframeAttrsConfig } from "./types";
import { getMaxHeightForModal } from "./ui-utils";
import {
  fromEntriesWithDuplicateKeys,
  isRouterPath,
  submitResponseAndGetRoutingResult,
  generateDataAttributes,
  getConfigProp,
  isSameBookingLink,
} from "./utils";

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
// Add App CSS Vars as soon as possible so that tailwind classes can work instantly.
addAppCssVars();

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

// eslint-disable-next-line @typescript-eslint/ban-types
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
  // If color-scheme not explicitly configured, keep it same as the webpage that has the iframe
  // This is done to avoid having an opaque background of iframe that arises when they aren't same. We really need to have a transparent background to make embed part of the page
  // https://fvsch.com/transparent-iframes#:~:text=the%20resolution%20was%3A-,If%20the%20color%20scheme%20of%20an%20iframe%20differs%20from%20embedding%20document%2C%20iframe%20gets%20an%20opaque%20canvas%20background%20appropriate%20to%20its%20color%20scheme.,-So%20the%20dark
  if (!config["ui.color-scheme"]) {
    const colorScheme = getColorScheme(containerEl);
    // Only handle two color-schemes for now. We don't want to have unintended affect by always explicitly adding color-scheme
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

  modalBox?: Element;

  inlineEl?: Element;

  namespace: string;

  actionManager: SdkActionManager;

  iframeReady!: boolean;

  iframeDoQueue: DoInIframeArg[] = [];

  api: CalApi;

  isPrerendering?: boolean;

  static actionsManagers: Record<Namespace, SdkActionManager>;
  // Store calLink separately and not rely on deriving it from iframe.src, because we could load different URL in iframe(derived from calLink e.g. calLink=Router -> redirects to eventBookingUrl and then we load that URL in iframe)
  calLink: string | null = null;
  embedConfig: PrefillAndIframeAttrsConfig | null = null;
  // Tracks the time when the embed was last rendered with some changes to iframe i.e. it identifies if the iframe is freshly updated and when
  embedRenderStartTime: number | null = null;
  static ensureGuestKey(config: PrefillAndIframeAttrsConfig) {
    config = config || {};
    return {
      ...config,
      // guests is better for API but Booking Page accepts guest. So do the mapping
      guest: config.guests ?? undefined,
    } as PrefillAndIframeAttrsConfigWithGuest;
  }

  processInstruction(instructionAsArgs: IArguments | Instruction) {
    // The instruction is actually an array-like object(arguments). Make it an array.
    const instruction: Instruction = [].slice.call(instructionAsArgs);
    // If there are multiple instructions in the array, process them one by one
    if (typeof instruction[0] !== "string") {
      // It is an instruction
      instruction.forEach((instruction) => {
        this.processInstruction(instruction);
      });
      return;
    }

    const [method, ...args] = instruction;
    if (!this.api[method]) {
      // Instead of throwing error, log and move forward in the queue
      error(`Instruction ${method} not FOUND`);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore There can be any method which can have any number of arguments.
      this.api[method](...args);
    } catch (e) {
      // Instead of throwing error, log and move forward in the queue
      error(`Instruction couldn't be executed`, e);
    }
    return instruction;
  }

  processQueue(queue: Queue) {
    queue.forEach((instruction) => {
      this.processInstruction(instruction);
    });

    queue.splice(0);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /** @ts-ignore */ // We changed the definition of push here.
    queue.push = (instruction) => {
      this.processInstruction(instruction);
    };
  }

  /**
   * Iframe is added invisible and shown only after color-scheme is set by the embedded calLink to avoid flash of non-transparent(white/black) background
   */
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
    log("Loading in iframe", calLink);
    iframe.dataset.calLink = calLink;
    const calConfig = this.getCalConfig();
    const { iframeAttrs, ...queryParamsFromConfig } = config;

    if (iframeAttrs && iframeAttrs.id) {
      iframe.setAttribute("id", iframeAttrs.id);
    }

    const searchParams = this.buildFilteredQueryParams(queryParamsFromConfig);

    // cal.com has rewrite issues on Safari that sometimes cause 404 for assets.
    const originToUse = (calOrigin || calConfig.calOrigin || "").replace(
      "https://cal.com",
      "https://app.cal.com"
    );

    const urlInstance = new URL(`${originToUse}/${calLink}`);
    if (!urlInstance.pathname.endsWith("embed")) {
      // TODO: Make a list of patterns that are embeddable. All except that should be allowed with a warning that "The page isn't optimized for embedding"
      urlInstance.pathname = `${urlInstance.pathname}/embed`;
    }

    urlInstance.searchParams.set("embed", this.namespace);

    if (calConfig.debug) {
      urlInstance.searchParams.set("debug", `${calConfig.debug}`);
    }

    // Keep iframe invisible, till the embedded calLink sets its color-scheme. This is so that there is no flash of non-transparent(white/black) background
    iframe.style.visibility = "hidden";

    if (calConfig.uiDebug) {
      iframe.style.border = "1px solid green";
    }

    // Merge searchParams from config onto the URL which might have query params already
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    for (const [key, value] of searchParams) {
      urlInstance.searchParams.append(key, value);
    }

    // Very Important:Reset iframe ready flag, as iframe might load a fresh URL and we need to check when it is ready.
    this.iframeReady = false;

    if (iframe.src === urlInstance.toString()) {
      // Ensure reload occurs even if the url is same - Though browser normally does it, but would be better to ensure it
      // This param has no other purpose except to ensure forced reload.
      urlInstance.searchParams.append("__cal.reloadTs", Date.now().toString());
    }

    iframe.src = urlInstance.toString();
    return iframe;
  }

  /**
   * Returns the config applicable to entire Cal namespace.
   * Individual embeds can have their own embed config passed via `config` prop normally.
   * Also, calOrigin could be passed individually as well at the moment
   */
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
      // TODO: Ensure that targetOrigin is as defined by user(and not *). Generally it would be cal.com but in case of self hosting it can be anything.
      // Maybe we can derive targetOrigin from __config.origin
      this.iframe.contentWindow.postMessage(
        { originator: "CAL", method: doInIframeArg.method, arg: doInIframeArg.arg },
        "*"
      );
    }
  }

  constructor(namespace: string, q: Queue) {
    this.__config = {
      // Use WEBAPP_URL till full page reload problem with website URL is solved
      calOrigin: WEBAPP_URL,
    };
    this.api = new CalApi(this);
    this.namespace = namespace;
    this.actionManager = new SdkActionManager(namespace);

    Cal.actionsManagers = Cal.actionsManagers || {};
    Cal.actionsManagers[namespace] = this.actionManager;

    this.processQueue(q);

    // 1. Initial iframe width and height would be according to 100% value of the parent element
    // 2. Once webpage inside iframe renders, it would tell how much iframe height should be increased so that my entire content is visible without iframe scroll
    // 3. Parent window would check what iframe height can be set according to parent Element
    this.actionManager.on("__dimensionChanged", (e) => {
      const { data } = e.detail;
      const iframe = this.iframe;

      if (!iframe) {
        // Iframe might be pre-rendering
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
        // It's a bit late to make the iframe visible here. We just needed to wait for the HTML tag of the embedded calLink to be rendered(which then informs the browser of the color-scheme)
        // TODO: Right now it would wait for embed-iframe.js bundle to be loaded as well. We can speed that up by inlining the JS that informs about color-scheme being set in the HTML.
        // But it's okay to do it here for now because the embedded calLink also keeps itself hidden till it receives `parentKnowsIframeReady` message(It has it's own reasons for that)
        // Once the embedded calLink starts not hiding the document, we should optimize this line to make the iframe visible earlier than this.
        // Imp: Don't use visibility:visible as that would make the iframe show even if the host element(A parent of the iframe) has visibility:hidden set. Just reset the visibility to default
        this.iframe.style.visibility = "";
      }
      this.doInIframe({ method: "parentKnowsIframeReady" } as const);
      this.iframeDoQueue.forEach((doInIframeArg) => {
        this.doInIframe(doInIframeArg);
      });
    });

    this.actionManager.on("__routeChanged", () => {
      if (!this.inlineEl) {
        return;
      }
      const { top, height } = this.inlineEl.getBoundingClientRect();
      // Try to readjust and scroll into view if more than 25% is hidden.
      // Otherwise we assume that user might have positioned the content appropriately already
      if (top < 0 && Math.abs(top / height) >= 0.25) {
        // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- Intentionally done
        this.inlineEl.scrollIntoView({ behavior: "smooth" });
      }
    });

    this.actionManager.on("linkReady", () => {
      if (this.isPrerendering) {
        // Ensure that we don't mark embed as loaded if it's prerendering otherwise prerendered embed could show-up without any user action
        return;
      }
      this.iframe!.style.visibility = "";

      // Removes the loader
      // TODO: We should be using consistent approach of "state" attribute for modalBox and inlineEl.
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

  private filterParams(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(params).filter(([key, value]) => !excludeParam(key, value)));
  }

  private getQueryParamsFromPage() {
    const queryParamsFromPage = getQueryParamsFromPage();
    // Ensure valid params are used from the page.
    return this.filterParams(queryParamsFromPage);
  }

  private buildFilteredQueryParams(queryParamsFromConfig: PrefillAndIframeAttrsConfig): URLSearchParams {
    const queryParamsFromPageUrl = globalCal.config?.forwardQueryParams ? this.getQueryParamsFromPage() : {};

    // Query Params via config have higher precedence
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
    stateData: {
      embedConfig: PrefillAndIframeAttrsConfig;
      previousEmbedConfig: PrefillAndIframeAttrsConfig | null;
      isConnectionInitiated: boolean;
      previousEmbedRenderStartTime: number | null;
      embedRenderStartTime: number;
    };
  }) {
    const {
      embedConfig,
      previousEmbedConfig,
      isConnectionInitiated,
      previousEmbedRenderStartTime,
      embedRenderStartTime,
    } = stateData;
    const calConfig = this.getCalConfig();
    const lastLoadedUrlInIframeObject = this.getLastLoadedLinkInframe();
    const lastLoadedPathInIframe = lastLoadedUrlInIframeObject?.pathname ?? null;
    const urlToLoadObject = new URL(pathWithQueryToLoad, calConfig.calOrigin as string);

    const existingModalEl = document.querySelector(`cal-modal-box[uid="${modal.uid}"]`);
    const urlToLoadPath = urlToLoadObject.pathname;
    // We only check for path because query params are handled by connect flow
    // Also origin we assume never changes without page reload of the embedding page
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
      ? timeSinceLastRender > EMBED_MODAL_IFRAME_FORCE_RELOAD_THRESHOLD_MS
      : false;

    const areSlotsStale = previousEmbedRenderStartTime
      ? timeSinceLastRender > EMBED_MODAL_IFRAME_SLOT_STALE_TIME
      : false;

    // Note that we don't worry about change in embed config because that is passed on as query params to the iframe and that is already supported by "connect" flow
    const isResetNeeded = !isSameCalLink || isInFailedState || crossedReloadThreshold;

    const actionToTake = isResetNeeded
      ? "fullReload"
      : !isSameConfig || !areSameQueryParams || !isConnectionInitiated || areSlotsStale
      ? "connect"
      : "noAction";

    log("Next Modal Action:", actionToTake, {
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
    });

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
      // Verify the two config have all props as same
      return Object.keys(embedConfig1).every((key) => {
        if (typeof embedConfig1[key] !== typeof embedConfig2[key]) {
          return false;
        }
        // Now we know both have same type.
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

  /**
   * Returns the last loaded URL in iframe.
   * Removes /embed from the pathname and returns the origin.
   */
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

  async submitThroughHeadlessRouterInModal({
    modal,
    calLinkUrlObject,
    stateData,
  }: {
    modal: { uid: string; element: Element; calOrigin: string | null };
    calLinkUrlObject: URL;
    stateData: {
      embedConfig: PrefillAndIframeAttrsConfigWithGuestAndColorScheme;
      previousEmbedConfig: PrefillAndIframeAttrsConfigWithGuestAndColorScheme | null;
      embedRenderStartTime: number;
      previousEmbedRenderStartTime: number | null;
      isConnectionInitiated: boolean;
    };
  }) {
    const { uid: modalBoxUid, element: modalEl, calOrigin: _calOrigin } = modal;
    const { embedConfig } = stateData;
    const lastLoadedUrlInIframeObject = this.getLastLoadedLinkInframe();
    const lastLoadedPathInIframe = lastLoadedUrlInIframeObject?.pathname ?? null;
    const calConfig = this.getCalConfig();
    const calOrigin = _calOrigin ?? calConfig.calOrigin;

    const headlessRouterPageObject = calLinkUrlObject;
    const result = await submitResponseAndGetRoutingResult({
      headlessRouterPageUrl: headlessRouterPageObject.toString(),
    });
    log("Headless router result", result);
    if ("redirect" in result) {
      const routerRedirectUrl = new URL(result.redirect);
      const paramsFromRedirect = fromEntriesWithDuplicateKeys(routerRedirectUrl.searchParams.entries());

      const newEmbedConfig = (this.embedConfig = {
        ...embedConfig,
        ...paramsFromRedirect,
      });
      const actionToTake = this.getNextActionForModal({
        modal: { uid: modalBoxUid },
        pathWithQueryToLoad: `${routerRedirectUrl.pathname}${routerRedirectUrl.search}`,
        stateData: {
          ...stateData,
          embedConfig: newEmbedConfig,
        },
      });
      if (actionToTake === "fullReload") {
        if (lastLoadedPathInIframe) {
          console.error("Preloaded iframe couldn't be used", {
            preloadedPath: lastLoadedPathInIframe,
            newPath: routerRedirectUrl.pathname,
          });
        }
        const pathWithoutStartingSlash = routerRedirectUrl.pathname.replace(/^\//, "");
        this.loadInIframe({
          calLink: pathWithoutStartingSlash,
          calOrigin,
          config: newEmbedConfig,
          iframe: this.iframe as HTMLIFrameElement,
        });
      } else {
        log("Reusing the same iframe for headless router", {
          routerRedirectUrl: routerRedirectUrl.toString(),
          lastLoadedPathInIframe,
        });

        // Connection Initiated
        this.doInIframe({
          method: "connect",
          arg: {
            config: newEmbedConfig,
            params: fromEntriesWithDuplicateKeys(routerRedirectUrl.searchParams.entries()),
          },
        });
      }
    } else if ("message" in result) {
      log("Setting message in modal", {
        message: result.message,
      });
      // TODO: We might need to sanitize the error message and error code before setting it
      modalEl.setAttribute("data-message", result.message);
      modalEl.setAttribute("state", "has-message");
    } else if ("error" in result) {
      log("Setting error in modal", {
        error: result.error,
      });
      // We need to show this message in the modal
      modalEl.setAttribute("data-error-code", "routerError");
      // TODO: We might need to sanitize the error message and error code before setting it
      modalEl.setAttribute("data-message", result.error);
      modalEl.setAttribute("state", "failed");
    }
  }
}

class CalApi {
  cal: Cal;
  static initializedNamespaces = [] as string[];
  modalUid?: string;
  prerenderedModalUid?: string;
  constructor(cal: Cal) {
    this.cal = cal;
  }

  /**
   * If namespaceOrConfig is a string, config is available in config argument
   * If namespaceOrConfig is an object, namespace is assumed to be default and config isn't provided
   */
  init(namespaceOrConfig?: string | InitArgConfig, config = {} as InitArgConfig) {
    let initForNamespace = "";
    if (typeof namespaceOrConfig !== "string") {
      config = (namespaceOrConfig || {}) as CalConfig;
    } else {
      initForNamespace = namespaceOrConfig;
    }

    // Just in case 'init' instruction belongs to another namespace, ignore it
    // Though it shouldn't happen normally as the snippet takes care of delegating the init instruction to appropriate namespace queue
    if (initForNamespace !== this.cal.namespace) {
      return;
    }

    CalApi.initializedNamespaces.push(this.cal.namespace);

    const { calOrigin: calOrigin, origin: origin, ...restConfig } = config;

    this.cal.__config.calOrigin = calOrigin || origin || this.cal.__config.calOrigin;

    this.cal.__config = { ...this.cal.__config, ...restConfig };
  }

  /**
   * Used when a non-default namespace is to be initialized
   * It allows default queue to take care of instantiation of the non-default namespace queue
   */
  initNamespace(namespace: string) {
    // Creating this instance automatically starts processing the queue for the namespace
    globalCal.ns[namespace].instance =
      globalCal.ns[namespace].instance || new Cal(namespace, globalCal.ns[namespace].q);
  }
  /**
   * It is an instruction that adds embed iframe inline as last child of the element
   */
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
          // TODO: Add a special type calLink for it and validate that it doesn't start with / or https?://
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

    // If someone re-executes inline embed instruction, we want to ensure that duplicate inlineEl isn't added to the page per namespace
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
    // validate(arguments[0], {
    //   required: true,
    //   props: {
    //     calLink: {
    //       required: true,
    //       type: "string",
    //     },
    //   },
    // });
    let existingEl: HTMLElement | null = null;

    if (attributes?.id) {
      existingEl = document.getElementById(attributes.id);
    }
    let el: FloatingButton;
    if (!existingEl) {
      el = document.createElement("cal-floating-button") as FloatingButton;
      // It makes it a target element that opens up embed modal on click
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
    dataset["buttonText"] = buttonText;
    dataset["hideButtonIcon"] = `${hideButtonIcon}`;
    dataset["buttonPosition"] = `${buttonPosition}`;
    dataset["buttonColor"] = `${buttonColor}`;
    dataset["buttonTextColor"] = `${buttonTextColor}`;
  }

  async modal({
    calLink,
    config = {},
    calOrigin,
    __prerender = false,
  }: {
    calLink: string;
    config?: PrefillAndIframeAttrsConfig;
    calOrigin?: string;
    __prerender?: boolean;
  }) {
    // `this.modalUid` is set in non-preload case(Temporarily not being-set)
    // `this.prerenderedModalUid` is set for a modal created through "prerender"
    const uid = this.modalUid || this.prerenderedModalUid || String(Date.now()) || "0";
    // Means whether there is already an attempt to use the prerendered modal
    const isConnectionInitiated = !!(this.modalUid && this.prerenderedModalUid);

    const containerEl = document.body;

    this.cal.isPrerendering = !!__prerender;

    if (__prerender) {
      // Add prerender query param
      config.prerender = "true";
      // When prerendering, we don't want to preload slots as they might be outdated anyway by the time they are used
      // Also, when used with Headless Router attributes setup, we might endup fetching slots for a lot of people, which would be a waste and unnecessary load on Cal.com resources
      config["cal.skipSlotsFetch"] = "true";
    }

    const configWithGuestKeyAndColorScheme = withColorScheme(
      Cal.ensureGuestKey({
        ...config,
        embedType: "modal",
      }),
      containerEl
    );

    const calConfig = this.cal.getCalConfig();
    // calOrigin could have been passed as empty string by the user
    calOrigin = calOrigin || calConfig.calOrigin;

    const embedRenderStartTime = Date.now();
    const previousEmbedConfig = this.cal.embedConfig;
    const previousEmbedRenderStartTime = this.cal.embedRenderStartTime;
    this.cal.embedConfig = configWithGuestKeyAndColorScheme;

    const existingModalEl = document.querySelector(`cal-modal-box[uid="${uid}"]`);

    // isConnectionPossible
    if (!!existingModalEl && !!this.cal.iframe) {
      const calLinkUrlObject = new URL(calLink, calOrigin);
      const isHeadlessRouterPath = calLinkUrlObject ? isRouterPath(calLinkUrlObject.toString()) : false;

      log(`Trying to reuse modal ${uid}`);
      const stateData = {
        embedConfig: configWithGuestKeyAndColorScheme,
        previousEmbedConfig,
        embedRenderStartTime,
        previousEmbedRenderStartTime,
        isConnectionInitiated,
      };
      if (isHeadlessRouterPath) {
        // Immediately take it to loading state. Either through connect or through loadInIframe, it would later be updated
        existingModalEl.setAttribute("state", "loading");

        // submitThroughHeadlessRouterInModal would further decide whether full page reload is needed or a connect would suffice
        // actionToTake might be "fullReload" and still connect could work in case of headless router because there might be just query params change(which can be handled by connect) of calLink(i.e. ?form=formid&newParam=newValue)
        await this.cal.submitThroughHeadlessRouterInModal({
          modal: { uid, element: existingModalEl, calOrigin },
          calLinkUrlObject,
          stateData,
        });
      } else {
        const actionToTake = this.cal.getNextActionForModal({
          modal: { uid },
          pathWithQueryToLoad: `${calLinkUrlObject.pathname}${calLinkUrlObject.search}`,
          stateData,
        });

        if (actionToTake === "noAction") {
          log(`Reopening modal without any other action needed ${uid}`);
          // Reopen the modal, nothing else to do
          existingModalEl.setAttribute("state", "reopened");
          return;
        }

        log("Attempting to load/connect regular booking link");
        // Immediately take it to loading state. Either through connect or through loadInIframe, it would later be updated
        existingModalEl.setAttribute("state", "loading");

        if (actionToTake === "fullReload") {
          log("Initiating full page load");
          this.cal.loadInIframe({
            calLink,
            calOrigin,
            iframe: this.cal.iframe,
            config: configWithGuestKeyAndColorScheme,
          });
        } else if (actionToTake === "connect") {
          this.cal.doInIframe({
            method: "connect",
            arg: {
              config: configWithGuestKeyAndColorScheme,
              params: fromEntriesWithDuplicateKeys(calLinkUrlObject.searchParams.entries()),
            },
          });
        }
      }

      // We reach here in case of connect or fullReload
      this.modalUid = uid;
      this.cal.embedRenderStartTime = embedRenderStartTime;
      return;
    }

    log(`Creating new modal ${uid}`);

    if (__prerender) {
      this.prerenderedModalUid = uid;
    } else {
      // Intentionally not setting it to avoid the behaviour of reusing the same modal. It was disabled earlier but now can be enabled but we will enable it later.
      // this.modalUid = uid;
    }

    if (typeof config.iframeAttrs === "string" || config.iframeAttrs instanceof Array) {
      throw new Error("iframeAttrs should be an object");
    }

    let iframe = null;

    if (!iframe) {
      iframe = this.cal.createIframe({
        calLink,
        config: configWithGuestKeyAndColorScheme,
        calOrigin,
      });
    }

    iframe.style.borderRadius = "8px";
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    const template = document.createElement("template");
    const pageType = getConfigProp(configWithGuestKeyAndColorScheme, "cal.embed.pageType");
    const theme = getConfigProp(configWithGuestKeyAndColorScheme, "theme");
    const layout = getConfigProp(configWithGuestKeyAndColorScheme, "layout");

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
    // Set state through setAttribute so that onAttributeChangedCallback is triggered
    this.cal.modalBox.setAttribute("state", "loading");

    if (__prerender) {
      this.cal.modalBox.setAttribute("state", "prerendering");
    }
    this.handleClose();
    containerEl.appendChild(template.content);
  }

  private handleClose() {
    // A request, to close from the iframe, should close the modal
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
  /**
   *
   * type is provided and prerenderIframe not set. We would assume prerenderIframe to be true
   * type is provided and prerenderIframe set to false. We would ignore the type and preload assets only
   * type is not provided and prerenderIframe set to true. We would throw error as we don't know what to prerender
   * type is not provided and prerenderIframe set to false. We would preload assets only
   */
  preload({
    calLink,
    type,
    options = {},
    pageType,
  }: {
    calLink: string;
    type?: "modal" | "floatingButton";
    options?: {
      prerenderIframe?: boolean;
    };
    pageType?: EmbedPageType;
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
    let prerenderIframe = options.prerenderIframe;
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
          calOrigin: config.calOrigin,
          __prerender: true,
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
  }: {
    calLink: string;
    type: "modal" | "floatingButton";
    pageType?: EmbedPageType;
  }) {
    this.preload({
      calLink,
      type,
      pageType,
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
// This is a full fledged Cal instance but doesn't have ns property because it would be nested inside an ns instance already
export interface GlobalCalWithoutNs {
  <T extends KeyOfSingleInstructionMap>(methodName: T, ...arg: Rest<SingleInstructionMap[T]>): void;
  /** Marks that the embed.js is loaded. Avoids re-downloading it. */
  loaded?: boolean;
  /** Maintains a queue till the time embed.js isn't loaded */
  q: Queue;
  /** If user registers multiple namespaces, those are available here */
  instance?: Cal;
  __css?: string;
  fingerprint?: string;
  version?: string;
  __logQueue?: unknown[];
  config?: GlobalConfig;
}

// Well Omit removes the Function Signature from a type if used. So, instead construct the types like this.
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

// Namespaces created before embed.js executes are instantiated here for old Embed Snippets which don't use 'initNamespace' instruction
// Snippets that support 'initNamespace' instruction don't really need this but it is okay if it's done because it's idempotent
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
  globalCal.__logQueue = globalCal.__logQueue || [];
  globalCal.__logQueue.push({ ...parsedAction, data: detail.data });

  if (!actionManager) {
    throw new Error(`Unhandled Action ${parsedAction}`);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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
  let config;
  try {
    config = JSON.parse(configString);
  } catch (e) {
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
    let calLinkEl;
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    if (target?.dataset.calLink) {
      calLinkEl = target;
    } else {
      // If the element clicked is a child of the cal-link element, then return the cal-link element
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
  // TODO: Maybe find a better way to identify change in color-scheme, a mutation observer seems overkill for this. Settle with setInterval for now.
  setInterval(() => {
    const colorScheme = getColorScheme(document.body);
    if (colorScheme && colorScheme !== currentColorScheme) {
      currentColorScheme = colorScheme;
      // Go through all the embeds on the same page and update all of them with this info
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
  let api;
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
  // Store Commit Hash to know exactly what version of the code is running
  // TODO: Ideally it should be the version as per package.json and then it can be renamed to version.
  // But because it is built on local machine right now, it is much more reliable to have the commit hash.
  globalCal.fingerprint = process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT as string;
  globalCal.version = process.env.EMBED_PUBLIC_EMBED_VERSION as string;
  globalCal.__css = tailwindCss;

  if (!globalCal.config) {
    globalCal.config = {};
  }

  // This is disabled by default because if we miss any param in reserved list, we might end up breaking embed Booking Form for a lot of users.
  // Better to be conservative and let the user decide if he wants to forward the params or not.
  // TODO: Going forward, Booking Form should maintain a list of params used by it and then we can enable this by default after using that list itself as reserved list.
  // Use if configured by user otherwise set default
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
