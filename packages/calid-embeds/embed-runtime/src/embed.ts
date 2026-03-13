import { EventChannel } from "./bus/channel";
import { createPostMessageRouter, sendPostMessage, type PostMessageEnvelope } from "./bus/post-message";
import type { EventEnvelope, EventRegistry } from "./bus/channel";
import { SLOT_STALE_DURATION, IFRAME_FORCE_RELOAD_DURATION, PRERENDER_COOLDOWN_DURATION } from "./constants";
import type { InterfaceWithParent, interfaceWithParent } from "./embed-iframe";
import css from "./embed.css";
import { findScrollableAncestor } from "./iframe/dom-utils";
import tailwindCss from "./tailwindCss";
import { modalMaxHeight } from "./theming/color";
import { injectAppCssVars } from "./theming/css-injector";
import type { UiOptions, PageKind, EmbedConfig, PrerenderConfig } from "./types/shared";
import {
  parseMultiParams,
  isRouterPath,
  dataAttrs,
  readConfig,
  bookingPathsMatch,
  withPrerenderConfig,
} from "./utils/params";
import { FloatingButton } from "./widgets/floating";
import { Inline } from "./widgets/inline";
import { ModalBox } from "./widgets/modal";

export type { EmbedEvent } from "./bus/channel";
export type { EmbedConfig as PrefillAndIframeAttrsConfig } from "./types/shared";

type Rest<T extends any[] | undefined> = T extends [any, ...infer U] ? U : never;

export type Message = {
  originator: string;
  method: keyof InterfaceWithParent;
  arg: InterfaceWithParent[keyof InterfaceWithParent];
};

const WEBAPP_URL = process.env.EMBED_PUBLIC_WEBAPP_URL || `https://${process.env.EMBED_PUBLIC_VERCEL_URL}`;

injectAppCssVars();
customElements.define("cal-modal-box", ModalBox);
customElements.define("cal-floating-button", FloatingButton);
customElements.define("cal-inline", Inline);

declare module "*.css" {}

type AppConfig = { calOrigin: string; debug?: boolean; uiDebug?: boolean; postMessageOrigins?: string[] };
type ModalElement = Element & { uid?: string };

type SnapshotData = {
  embedConfig: ResolvedEmbedConfig;
  previousEmbedConfig: ResolvedEmbedConfig | null;
  embedRenderStartTime: number;
  previousEmbedRenderStartTime: number | null;
  isConnectionInitiated: boolean;
  prerenderOptions: PrerenderConfig | null;
};

type InitConfig = Partial<AppConfig> & { origin?: string };

type DispatchEntry = {
  [K in keyof typeof interfaceWithParent]: {
    method: K;
    arg?: Parameters<(typeof interfaceWithParent)[K]>[0];
  };
}[keyof typeof interfaceWithParent];

const globalCal = window.Cal;
if (!globalCal?.q) throw new Error("Cal is not defined. This shouldn't happen");

bootstrap();
document.head.appendChild(document.createElement("style")).innerHTML = css;

type FieldRule = {
  required?: boolean;
  type?:
    | string
    | (new (...args: unknown[]) => unknown)
    | ((...args: unknown[]) => unknown)
    | (string | (new (...args: unknown[]) => unknown) | ((...args: unknown[]) => unknown))[];
};
type ValidationSchema = { required?: boolean; props?: Record<string, FieldRule> };

function validate(data: Record<string, unknown>, schema: ValidationSchema): void {
  const missing = (v: unknown) => typeof v === "undefined";
  if (schema.required && missing(data)) throw new Error("Argument is required");

  for (const [field, rule] of Object.entries(schema.props || {})) {
    if (rule.required && missing(data[field])) throw new Error(`"${field}" is required`);
    if (rule.type && !missing(data[field])) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      const ok = types.some((t) => {
        if (typeof t === "string") return typeof data[field] === t;
        if (typeof t === "function" && t.prototype) return data[field] instanceof t;
        return typeof data[field] === "function";
      });
      if (!ok) throw new Error(`"${field}" is of wrong type. Expected "${rule.type}"`);
    }
  }
}

type ResolvedEmbedConfig = EmbedConfig & { guest?: string | string[]; "ui.color-scheme"?: string | null };

function attachScheme(
  cfg: EmbedConfig & { guest?: string | string[] },
  container: Element
): ResolvedEmbedConfig {
  if (!cfg["ui.color-scheme"]) {
    const scheme = detectColorScheme(container);
    if (scheme) cfg["ui.color-scheme"] = scheme;
  }
  return cfg;
}

type ListenerEntry = {
  [K in keyof EventRegistry]: { action: K; callback: (e: CustomEvent<EventEnvelope<K>>) => void };
}[keyof EventRegistry];

type ApiInstructionMap = {
  on: ["on", ListenerEntry];
  off: ["off", ListenerEntry];
} & {
  [K in Exclude<keyof EmbedApiImpl, "on" | "off">]: EmbedApiImpl[K] extends (...args: never[]) => void
    ? [K, ...Parameters<EmbedApiImpl[K]>]
    : never;
};

type Instruction = ApiInstructionMap[keyof ApiInstructionMap];
export type InstructionQueue = Instruction | Instruction[];

const RESERVED_PARAMS = [
  "month",
  "date",
  "slot",
  "rescheduleUid",
  "bookingUid",
  "duration",
  "overlayCalendar",
];

function isReserved(key: string): boolean {
  return RESERVED_PARAMS.includes(key);
}

function configsEqual(a: EmbedConfig, b: EmbedConfig): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => {
    if (typeof a[k] !== typeof b[k]) return false;
    const va = a[k],
      vb = b[k];
    if (Array.isArray(va) && Array.isArray(vb))
      return va.length === vb.length && va.every((x: string) => (vb as string[]).includes(x));
    if (typeof va === "string") return va === vb;
    return true;
  });
}

export class Cal {
  iframe?: HTMLIFrameElement;
  __config: AppConfig;
  modalBox?: ModalElement;
  inlineEl?: Element;
  namespace: string;
  actionManager: EventChannel;
  iframeReady = false;
  iframeDoQueue: DispatchEntry[] = [];
  api: EmbedApiImpl;
  isPrerendering?: boolean;
  calLink: string | null = null;
  embedConfig: EmbedConfig | null = null;
  embedRenderStartTime: number | null = null;
  postMessageRouter?: ReturnType<typeof createPostMessageRouter>;

  static actionBuses: Record<string, EventChannel> = {};

  static addGuestKey(cfg: EmbedConfig): EmbedConfig & { guest?: string | string[] } {
    return { ...cfg, guest: (cfg as any).guests ?? undefined };
  }

  handleInstruction(args: IArguments | Instruction): void {
    // eslint-disable-next-line prefer-rest-params
    const arr = [].slice.call(args) as unknown as Instruction;
    if (typeof arr[0] !== "string") {
      (arr as Instruction[]).forEach((i) => this.handleInstruction(i));
      return;
    }
    const [method, ...rest] = arr as [string, ...unknown[]];
    if (!this.api[method as keyof EmbedApiImpl]) {
      console.error(`Instruction ${method} not found`);
      return;
    }
    try {
      (this.api[method as keyof EmbedApiImpl] as any)(...rest);
    } catch (e) {
      console.error("Instruction failed", e);
    }
  }

  drainQueue(q: Queue): void {
    q.forEach((item) => this.handleInstruction(item));
    q.splice(0);
    (q as any).push = (item: Instruction) => this.handleInstruction(item);
  }

  buildIframe({
    calLink,
    config = {},
    calOrigin,
  }: {
    calLink: string;
    config?: ResolvedEmbedConfig;
    calOrigin: string | null;
  }): HTMLIFrameElement {
    const frame = (this.iframe = document.createElement("iframe"));
    frame.className = "cal-embed";
    frame.name = `cal-embed=${this.namespace}`;
    frame.title = "Book a call";
    this.loadIntoIframe({ calLink, config, calOrigin, iframe: frame });
    return frame;
  }

  loadIntoIframe({
    calLink,
    config = {},
    calOrigin,
    iframe,
  }: {
    iframe: HTMLIFrameElement;
    calLink: string;
    config?: EmbedConfig;
    calOrigin: string | null;
  }): HTMLIFrameElement {
    iframe.dataset.calLink = calLink;
    const appCfg = this.getAppConfig();
    const { iframeAttrs, ...queryCfg } = config;

    if (iframeAttrs?.id) iframe.setAttribute("id", iframeAttrs.id);
    iframe.setAttribute("allow", "payment");

    const queryParams = this.buildParams(queryCfg);
    const origin = calOrigin || appCfg.calOrigin || "";

    const iframeUrl = new URL(`${origin}/${calLink}`);

    if (!iframeUrl.pathname.endsWith("embed")) iframeUrl.pathname = `${iframeUrl.pathname}/embed`;
    iframeUrl.searchParams.set("embed", this.namespace);

    const pageParams = this.getPageParams();
    if (appCfg.debug || pageParams["cal.embed.logging"] === "1") {
      iframeUrl.searchParams.set("debug", "true");
    }

    iframe.style.visibility = "hidden";
    if (appCfg.uiDebug) iframe.style.border = "1px solid green";

    for (const [k, v] of queryParams as any) iframeUrl.searchParams.append(k, v);

    this.iframeReady = false;
    if (iframe.src === iframeUrl.toString()) {
      iframeUrl.searchParams.append("__cal.reloadTs", Date.now().toString());
    }

    iframe.src = iframeUrl.toString();
    return iframe;
  }

  getAppConfig(): AppConfig {
    return this.__config;
  }

  sendToIframe(msg: DispatchEntry): void {
    if (!this.iframeReady) {
      this.iframeDoQueue.push(msg);
      return;
    }
    if (!this.iframe) throw new Error("No iframe");
    this.iframe.contentWindow?.postMessage({ originator: "CAL", method: msg.method, arg: msg.arg }, "*");
  }

  forwardPostMessageToIframe(msg: PostMessageEnvelope): void {
    if (!this.iframe) return;
    sendPostMessage(this.iframe.contentWindow as Window, msg, "*");
  }

  constructor(ns: string, q: Queue) {
    console.log("WEBAPPURL: ", WEBAPP_URL);
    this.__config = { calOrigin: WEBAPP_URL };
    this.api = new EmbedApiImpl(this);
    this.namespace = ns;
    this.actionManager = new EventChannel(ns);
    Cal.actionBuses = Cal.actionBuses || {};
    Cal.actionBuses[ns] = this.actionManager;

    this.postMessageRouter = createPostMessageRouter({
      namespace: ns,
      allowedOrigins: this.__config.postMessageOrigins,
      handlers: {
        set_calendar_event_type: (msg) => this.forwardPostMessageToIframe(msg),
        set_field_value: (msg) => this.forwardPostMessageToIframe(msg),
        booking_acknowledgement: (msg) => this.forwardPostMessageToIframe(msg),
      },
    });
    this.postMessageRouter.attach();

    this.drainQueue(q);
    this.wireListeners();
  }

  private wireListeners(): void {
    this.actionManager.listen("__dimensionChanged", (e) => {
      const { data } = e.detail;
      if (!this.iframe) return;
      if (data.iframeHeight) this.iframe.style.height = `${data.iframeHeight}px`;
      if (this.modalBox) this.iframe.style.maxHeight = `${modalMaxHeight()}px`;
    });

    this.actionManager.listen("__iframeReady", (e) => {
      this.iframeReady = true;
      if (this.iframe && !e.detail.data.isPrerendering) this.iframe.style.visibility = "";
      this.sendToIframe({ method: "parentKnowsIframeReady" } as const);
      this.iframeDoQueue.forEach((m) => this.sendToIframe(m));
    });

    this.actionManager.listen("__routeChanged", () => {
      if (!this.inlineEl) return;
      const { top, height } = this.inlineEl.getBoundingClientRect();
      if (top < 0 && Math.abs(top / height) >= 0.25) {
        // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed
        this.inlineEl?.scrollIntoView({ behavior: "smooth" });
      }
    });

    this.actionManager.listen("__scrollByDistance", (e) => {
      if (!this.inlineEl) return;
      this.scrollBy(e.detail.data.distance);
    });

    this.actionManager.listen("linkReady", () => {
      if (this.isPrerendering) return;
      if (this.iframe) this.iframe.style.visibility = "";
      this.modalBox?.setAttribute("state", "loaded");
      this.inlineEl?.setAttribute("loading", "done");
    });

    this.actionManager.listen("linkFailed", (e) => {
      if (!this.iframe || this.isPrerendering) return;
      this.inlineEl?.setAttribute("data-error-code", e.detail.data.code);
      this.modalBox?.setAttribute("data-error-code", e.detail.data.code);
      this.inlineEl?.setAttribute("loading", "failed");
      this.modalBox?.setAttribute("state", "failed");
    });
  }

  scrollBy(px: number): void {
    if (!this.iframe) return;
    const scrollable = findScrollableAncestor(this.iframe);
    if (!scrollable) return;
    scrollable.scrollTo({ top: scrollable.scrollTop + px, behavior: "smooth" });
  }

  private stripReserved(params: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(params).filter(([k]) => !isReserved(k)));
  }

  private getPageParams(): Record<string, string | string[]> {
    return this.stripReserved(parseMultiParams(new URLSearchParams(window.location.search).entries())) as any;
  }

  private buildParams(cfg: EmbedConfig): URLSearchParams {
    const fromPage = globalCal.config?.forwardQueryParams ? this.getPageParams() : {};
    const combined = { ...fromPage, ...cfg };
    return Object.entries(combined).reduce((sp, [k, v]) => {
      if (v === undefined) return sp;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else sp.set(k, v as string);
      return sp;
    }, new URLSearchParams());
  }

  decideAction({
    modal,
    targetPath,
    snapshot,
  }: {
    modal: { uid: string };
    targetPath: string;
    snapshot: SnapshotData;
  }): "fullReload" | "connect" | "connect-no-slots-fetch" | "noAction" {
    const {
      embedConfig,
      previousEmbedConfig,
      isConnectionInitiated,
      previousEmbedRenderStartTime,
      embedRenderStartTime,
      prerenderOptions,
    } = snapshot;
    const appCfg = this.getAppConfig();
    const lastUrl = this.getLoadedLink();
    const lastPath = lastUrl?.pathname ?? null;
    const targetUrl = new URL(targetPath, appCfg.calOrigin as string);
    const existing = document.querySelector(`cal-modal-box[uid="${modal.uid}"]`);

    const sameLink = lastPath && bookingPathsMatch({ path1: lastPath, path2: targetUrl.pathname });
    const sameQuery = lastUrl?.searchParams.toString() === targetUrl.searchParams.toString();
    const sameConfig = previousEmbedConfig && configsEqual(previousEmbedConfig, embedConfig);
    const hasFailed = existing?.getAttribute("state") === "failed";

    const elapsed = previousEmbedRenderStartTime ? embedRenderStartTime - previousEmbedRenderStartTime : 0;
    const needsReload = previousEmbedRenderStartTime
      ? elapsed > (prerenderOptions?.iframeForceReloadThresholdMs ?? IFRAME_FORCE_RELOAD_DURATION)
      : false;
    const stale = previousEmbedRenderStartTime
      ? elapsed > (prerenderOptions?.slotsStaleTimeMs ?? SLOT_STALE_DURATION)
      : false;

    if (!sameLink || hasFailed || needsReload) return "fullReload";
    if (prerenderOptions?.backgroundSlotsFetch && !stale) return "connect-no-slots-fetch";
    if (!sameConfig || !sameQuery || !isConnectionInitiated || stale) return "connect";
    return "noAction";
  }

  getLoadedLink(): URL | null {
    if (!this.iframe?.dataset.calLink) return null;
    const baseOrigin = new URL(this.iframe.src).origin;
    const link = this.iframe.dataset.calLink;
    const resolved = new URL(link, baseOrigin);
    return new URL(`${resolved.pathname}${resolved.search}, resolved.origin`);
  }

  patchTrackedParams(params: Record<string, string | string[]>): void {
    const current = this.getLoadedLink();
    if (!current || !this.iframe) return;
    const updated = new URL(current.toString());
    Object.entries(params).forEach(([k, v]) => updated.searchParams.set(k, v as string));
    this.iframe.dataset.calLink = `${updated.pathname.replace(/^\//, "")}${updated.search}`;
  }

  canPrerender({
    calLink,
    calOrigin,
    previousTime,
  }: {
    calLink: string;
    calOrigin: string;
    previousTime: number | null;
  }): boolean {
    const current = this.getLoadedLink();
    const same = current?.toString() === new URL(calLink, calOrigin).toString();
    if (same) {
      if (!previousTime) return false;
      return Date.now() - previousTime >= PRERENDER_COOLDOWN_DURATION;
    }
    return true;
  }

  preparePrerender({
    calLink,
    calOrigin,
    previousTime,
    prerenderOptions,
    isRouter,
  }: {
    calLink: string;
    calOrigin: string;
    previousTime: number | null;
    prerenderOptions: PrerenderConfig;
    isRouter: boolean;
  }) {
    if (!this.canPrerender({ calLink, calOrigin, previousTime })) return null;
    if (this.modalBox) this.modalBox.remove();

    const useBackground =
      typeof prerenderOptions.backgroundSlotsFetch === "undefined"
        ? isRouter
        : prerenderOptions.backgroundSlotsFetch;
    const enriched = { ...prerenderOptions, backgroundSlotsFetch: useBackground };
    this.api.savedPrerenderOptions = enriched;
    this.isPrerendering = true;
    return { enrichedPrerenderOptions: enriched };
  }

  recordRenderStart({ cfg, ts }: { cfg: EmbedConfig; ts: number }): void {
    this.embedConfig = cfg;
    this.embedRenderStartTime = ts;
  }

  getPriorRender() {
    return { embedConfig: this.embedConfig, embedRenderStartTime: this.embedRenderStartTime };
  }

  doConnect({ config, params }: { config: EmbedConfig; params: Record<string, string | string[]> }): void {
    this.patchTrackedParams(params);
    this.sendToIframe({ method: "connect", arg: { config, params } });
  }
}

class EmbedApiImpl {
  cal: Cal;
  static usedNamespaces: string[] = [];
  modalUid?: string;
  prerenderedModalUid?: string;
  savedPrerenderOptions?: PrerenderConfig;

  constructor(cal: Cal) {
    this.cal = cal;
  }

  init(nsOrCfg?: string | InitConfig, cfg = {} as InitConfig): void {
    let targetNs = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof nsOrCfg !== "string") cfg = (nsOrCfg || {}) as AppConfig;
    else targetNs = nsOrCfg;
    if (targetNs !== this.cal.namespace) return;

    EmbedApiImpl.usedNamespaces.push(this.cal.namespace);
    const { calOrigin, origin, ...rest } = cfg;
    this.cal.__config.calOrigin = calOrigin || origin || this.cal.__config.calOrigin;
    this.cal.__config = { ...this.cal.__config, ...rest };
  }

  initNamespace(ns: string): void {
    globalCal.ns[ns].instance = globalCal.ns[ns].instance || new Cal(ns, globalCal.ns[ns].q);
  }

  inline({
    calLink,
    elementOrSelector,
    config,
  }: {
    calLink: string;
    elementOrSelector: string | HTMLElement;
    config?: EmbedConfig;
  }): void {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0] as any, {
      required: true,
      props: {
        calLink: { required: true, type: "string" },
        elementOrSelector: { required: true, type: ["string", HTMLElement] },
        config: { required: false, type: Object },
      },
    });

    if (this.cal.inlineEl && document.body.contains(this.cal.inlineEl)) {
      console.warn("Inline embed already exists");
      return;
    }

    config = config || {};
    if (typeof config.iframeAttrs === "string" || Array.isArray(config.iframeAttrs)) {
      throw new Error("iframeAttrs must be object");
    }

    const container =
      elementOrSelector instanceof HTMLElement
        ? elementOrSelector
        : document.querySelector(elementOrSelector);
    if (!container) throw new Error("Element not found");

    config.embedType = "inline";
    const appCfg = this.cal.getAppConfig();
    const frame = this.cal.buildIframe({
      calLink,
      config: attachScheme(Cal.addGuestKey(config), container),
      calOrigin: appCfg.calOrigin,
    });

    frame.style.height = "100%";
    frame.style.width = "100%";
    container.classList.add("cal-inline-container");

    const pageType = readConfig(config, "cal.embed.pageType");
    const theme = readConfig(config, "theme");
    const layout = readConfig(config, "layout");

    const tmpl = document.createElement("template");
    tmpl.innerHTML = [
      `<cal-inline ${dataAttrs({ pageType, theme, layout })}`,
      ` style="max-height:inherit;height:inherit;min-height:inherit;display:flex;position:relative;flex-wrap:wrap;width:100%"></cal-inline>`,
      `<style>.cal-inline-container::-webkit-scrollbar{display:none}.cal-inline-container{scrollbar-width:none}</style>`,
    ].join("");

    this.cal.inlineEl = tmpl.content.children[0];
    this.cal.inlineEl.appendChild(frame);
    container.appendChild(tmpl.content);
  }

  floatingButton({
    calLink,
    buttonText = "Book my Cal ID",
    hideButtonIcon = false,
    attributes,
    buttonPosition = "bottom-right",
    buttonColor = "rgb(0,0,0)",
    buttonTextColor = "rgb(255,255,255)",
    calOrigin,
    config,
  }: {
    calLink: string;
    buttonText?: string;
    attributes?: Record<"id", string>;
    hideButtonIcon?: boolean;
    buttonPosition?: "bottom-left" | "bottom-right";
    buttonColor?: string;
    buttonTextColor?: string;
    calOrigin?: string;
    config?: EmbedConfig;
  }): void {
    let existing: HTMLElement | null = null;
    if (attributes?.id) existing = document.getElementById(attributes.id);

    let btn: FloatingButton;
    if (!existing) {
      btn = document.createElement("cal-floating-button") as FloatingButton;
      btn.dataset.calLink = calLink;
      btn.dataset.calNamespace = this.cal.namespace;
      btn.dataset.calOrigin = calOrigin ?? "";
      if (config) btn.dataset.calConfig = JSON.stringify(config);
      if (attributes?.id) btn.id = attributes.id;
      document.body.appendChild(btn);
    } else {
      btn = existing as FloatingButton;
    }

    Object.assign(btn.dataset, {
      buttonText,
      hideButtonIcon: `${hideButtonIcon}`,
      buttonPosition: `${buttonPosition}`,
      buttonColor: `${buttonColor}`,
      buttonTextColor: `${buttonTextColor}`,
    });
  }

  async modal({
    calLink,
    config = {},
    calOrigin,
    __prerender = false,
    prerenderOptions = {},
  }: {
    calLink: string;
    config?: EmbedConfig;
    calOrigin?: string;
    __prerender?: boolean;
    prerenderOptions?: PrerenderConfig;
  }): Promise<any> {
    if (typeof config.iframeAttrs === "string" || Array.isArray(config.iframeAttrs)) {
      throw new Error("iframeAttrs must be object");
    }

    const appCfg = this.cal.getAppConfig();
    config = { ...config };
    calOrigin = calOrigin || appCfg.calOrigin;

    const linkUrl = new URL(calLink, calOrigin);
    const isRouter = isRouterPath(linkUrl.toString());
    const { embedConfig: prevCfg, embedRenderStartTime: prevTs } = this.cal.getPriorRender();
    const base = attachScheme(Cal.addGuestKey({ ...config, embedType: "modal" }), document.body);

    let enrichedCfg: EmbedConfig;
    let enrichedOpts: PrerenderConfig | undefined;

    if (__prerender) {
      const prep = this.cal.preparePrerender({
        calLink,
        calOrigin,
        previousTime: prevTs,
        prerenderOptions,
        isRouter,
      });
      if (!prep) return { status: "prerender-prevented" };
      enrichedOpts = prep.enrichedPrerenderOptions;
      enrichedCfg = withPrerenderConfig({
        config: base,
        isRouterLink: isRouter,
        fetchSlotsInBackground: !!this.savedPrerenderOptions?.backgroundSlotsFetch,
      });
    } else {
      this.cal.isPrerendering = false;
      enrichedCfg = base;
    }

    const reuseUid = this.modalUid || this.prerenderedModalUid;
    const uid = reuseUid || String(Date.now());
    const alreadyConnected = !!(this.modalUid && this.prerenderedModalUid);
    const ts = Date.now();

    const snapshot: SnapshotData = {
      embedConfig: enrichedCfg,
      previousEmbedConfig: prevCfg as any,
      embedRenderStartTime: ts,
      previousEmbedRenderStartTime: prevTs,
      isConnectionInitiated: alreadyConnected,
      prerenderOptions: enrichedOpts ?? this.savedPrerenderOptions ?? null,
    };

    this.cal.recordRenderStart({ cfg: enrichedCfg, ts });

    return this._openModal({
      uid,
      calLink,
      enrichedCfg,
      calOrigin,
      isPrerendering: __prerender,
      snapshot,
      container: document.body,
    });
  }

  async _openModal({
    uid,
    calLink,
    enrichedCfg,
    calOrigin,
    isPrerendering,
    snapshot,
    container,
  }: {
    uid: string;
    calLink: string;
    enrichedCfg: EmbedConfig;
    calOrigin: string;
    isPrerendering: boolean;
    snapshot: SnapshotData;
    container: HTMLElement;
  }): Promise<any> {
    const linkUrl = new URL(calLink, calOrigin);
    const isRouter = isRouterPath(linkUrl.toString());
    const existing = document.querySelector(`cal-modal-box[uid="${uid}"]`);

    if (existing && this.cal.iframe) {
      const currentLink = this.cal.getLoadedLink();
      const currentIsRouter = currentLink?.pathname?.includes("/router");
      if (isRouter && !currentIsRouter) throw new Error("prerender should use router path");

      const action = this.cal.decideAction({
        modal: { uid },
        targetPath: `${linkUrl.pathname}${linkUrl.search}`,
        snapshot,
      });

      if (action === "noAction") {
        if (isPrerendering) return;
        existing.setAttribute("state", "reopened");
        return;
      }

      existing.setAttribute("state", "loading");

      if (action === "fullReload") {
        this.cal.loadIntoIframe({ calLink, calOrigin, iframe: this.cal.iframe, config: enrichedCfg });
      } else if (action === "connect" || action === "connect-no-slots-fetch") {
        const extra =
          action === "connect-no-slots-fetch" ? { "cal.embed.noSlotsFetchOnConnect": "true" as const } : {};
        this.cal.doConnect({
          config: { ...enrichedCfg, ...extra },
          params: parseMultiParams(linkUrl.searchParams.entries()),
        });
      }

      this.modalUid = uid;
      return;
    }

    if (isPrerendering) this.prerenderedModalUid = uid;

    const frame = this.cal.buildIframe({ calLink, config: enrichedCfg, calOrigin });
    frame.style.borderRadius = "8px";
    frame.style.height = "100%";
    frame.style.width = "100%";

    const pageType = readConfig(enrichedCfg, "cal.embed.pageType");
    const theme = readConfig(enrichedCfg, "theme");
    const layout = readConfig(enrichedCfg, "layout");

    const tmpl = document.createElement("template");
    tmpl.innerHTML = `<cal-modal-box ${dataAttrs({ pageType, theme, layout })} uid="${uid}"></cal-modal-box>`;

    this.cal.modalBox = tmpl.content.children[0];
    this.cal.modalBox.appendChild(frame);
    this.cal.modalBox.setAttribute("state", "loading");
    if (isPrerendering) this.cal.modalBox.setAttribute("state", "prerendering");

    this.hookModalClose();
    container.appendChild(tmpl.content);
    return { status: "created" };
  }

  private hookModalClose(): void {
    this.cal.actionManager.listen("__closeIframe", () => {
      this.cal.modalBox?.setAttribute("state", "closed");
    });
  }

  on<T extends keyof EventRegistry>({
    action,
    callback,
  }: {
    action: T;
    callback: (e: CustomEvent<EventEnvelope<T>>) => void;
  }): void {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0] as any, {
      required: true,
      props: {
        action: { required: true, type: "string" },
        callback: { required: true, type: "function" },
      },
    });
    this.cal.actionManager.listen(action, callback);
  }

  off<T extends keyof EventRegistry>({
    action,
    callback,
  }: {
    action: T;
    callback: (e: CustomEvent<EventEnvelope<T>>) => void;
  }): void {
    this.cal.actionManager.unlisten(action, callback);
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
    options?: { prerenderIframe?: boolean; slotsStaleTimeMs?: number; iframeForceReloadThresholdMs?: number };
    pageType?: PageKind;
    calOrigin?: string;
  }): void {
    // eslint-disable-next-line prefer-rest-params
    validate(arguments[0] as any, {
      required: true,
      props: {
        calLink: { type: "string", required: true },
        type: { type: "string", required: false },
        options: { type: Object, required: false },
      },
    });

    const targetApi: GlobalCalNoNs = this.cal.namespace ? globalCal.ns[this.cal.namespace] : globalCal;
    if (!targetApi) throw new Error(`Namespace ${this.cal.namespace} undefined`);

    const appCfg = this.cal.getAppConfig();
    const { prerenderIframe, ...prOpts } = options;
    let shouldPrerender = prerenderIframe;
    if (type && shouldPrerender === undefined) shouldPrerender = true;
    if (!type && shouldPrerender) throw new Error("'type' required for prerender");

    if (shouldPrerender) {
      if (type === "modal" || type === "floatingButton") {
        this.cal.isPrerendering = true;
        this.modal({
          calLink,
          calOrigin: calOrigin || appCfg.calOrigin,
          __prerender: true,
          prerenderOptions: prOpts,
          ...(pageType ? { config: { "cal.embed.pageType": pageType } } : {}),
        });
      } else {
        console.warn("Inline preload: only assets");
        preloadAssets({ calLink, config: appCfg });
      }
    } else {
      preloadAssets({ calLink, config: appCfg });
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
    pageType?: PageKind;
    calOrigin?: string;
    options?: { slotsStaleTimeMs?: number; iframeForceReloadThresholdMs?: number };
  }): void {
    this.preload({ calLink, type, pageType, calOrigin, options });
  }

  ui(cfg: UiOptions): void {
    validate(cfg as any, {
      required: true,
      props: {
        theme: { required: false, type: "string" },
        styles: { required: false, type: Object },
      },
    });
    this.cal.sendToIframe({ method: "ui", arg: cfg });
  }
}

export type Queue = Instruction[];
type GlobalConfig = { forwardQueryParams?: boolean };

export interface GlobalCalNoNs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T extends keyof ApiInstructionMap>(m: T, ...args: Rest<ApiInstructionMap[T]>): void;
  loaded?: boolean;
  q: Queue;
  instance?: Cal;
  __css?: string;
  fingerprint?: string;
  version?: string;
  __logQueue?: unknown[];
  config?: GlobalConfig;
}

type GlobalCalFull = GlobalCalNoNs & { ns: Record<string, GlobalCalNoNs> };
export type GlobalCal = GlobalCalFull;

declare global {
  interface Window {
    Cal: GlobalCal;
  }
}

export interface CalWindow extends Window {
  Cal: GlobalCal;
}

const DEFAULT_NS = "";
globalCal.instance = new Cal(DEFAULT_NS, globalCal.q);

for (const [ns, api] of Object.entries(globalCal.ns)) {
  api.instance = api.instance ?? new Cal(ns, api.q);
}

window.addEventListener("message", (e) => {
  const detail = e.data;
  const parsed = EventChannel.parseFullType(detail.fullType);
  if (!parsed) return;

  const bus = Cal.actionBuses[parsed.ns];
  globalCal.__logQueue = globalCal.__logQueue || [];
  globalCal.__logQueue.push({ ...parsed, data: detail.data });

  if (!bus) throw new Error(`Unhandled Action ${JSON.stringify(parsed)}`);
  bus.publish(parsed.type as any, detail.data);
});

document.addEventListener("click", (e) => {
  const el = findDataCalLink(e.target);
  const path = el?.dataset?.calLink;
  if (!path) return;

  const ns = el.dataset.calNamespace;
  const cfgStr = el.dataset.calConfig || "";
  const origin = el.dataset.calOrigin || "";

  let cfg: EmbedConfig;
  try {
    cfg = JSON.parse(cfgStr);
  } catch {
    cfg = {};
  }

  const api: GlobalCalNoNs = ns ? globalCal.ns[ns] : globalCal;
  if (!api) throw new Error(`Namespace ${ns} not defined`);
  api("modal", { calLink: path, config: cfg, calOrigin: origin });
});

function findDataCalLink(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (target.dataset.calLink) return target;
  const match = Array.from(document.querySelectorAll("[data-cal-link]")).find((el) => el.contains(target));
  return match instanceof HTMLElement ? match : null;
}

let lastScheme: string | null = null;

setInterval(() => {
  const scheme = detectColorScheme(document.body);
  if (scheme && scheme !== lastScheme) {
    lastScheme = scheme;
    EmbedApiImpl.usedNamespaces.forEach((ns) => {
      const api = ns === DEFAULT_NS ? globalCal : globalCal.ns[ns];
      api("ui", { colorScheme: scheme });
    });
  }
}, 50);

function preloadAssets({ config, calLink }: { config: AppConfig; calLink: string }): void {
  const frame = document.body.appendChild(document.createElement("iframe"));
  const url = new URL(`${config.calOrigin}/${calLink}`);
  url.searchParams.set("preload", "true");
  frame.src = url.toString();
  frame.style.cssText = "width:0;height:0;display:none;";
}

function bootstrap(): void {
  globalCal.fingerprint = process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT as string;
  globalCal.version = process.env.EMBED_PUBLIC_EMBED_VERSION as string;
  globalCal.__css = tailwindCss;
  globalCal.config ??= {};
  globalCal.config.forwardQueryParams ??= false;
}

function detectColorScheme(el: Element): string | null {
  const scheme = getComputedStyle(el).colorScheme;
  return scheme === "dark" || scheme === "light" ? scheme : null;
}
