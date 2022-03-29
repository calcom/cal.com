import type { CalWindow } from "@calcom/embed-snippet";

import { ModalBox } from "./ModalBox";
import { methods, UiConfig } from "./embed-iframe";
import css from "./embed.css";
import { SdkActionManager } from "./sdk-action-manager";

declare module "*.css";

type Namespace = string;

const globalCal = (window as CalWindow).Cal;

if (!globalCal || !globalCal.q) {
  throw new Error("Cal is not defined. This shouldn't happen");
}

document.head.appendChild(document.createElement("style")).innerHTML = css;

function log(...args: any[]) {
  console.log(...args);
}

export type Instruction = [method: string, argument: any] | [method: string, argument: any][];
export type InstructionQueue = Instruction[];

export class Cal {
  iframe?: HTMLIFrameElement;

  __config: any;

  namespace: string;

  actionManager: SdkActionManager;

  iframeReady!: boolean;

  iframeDoQueue: { method: keyof typeof methods; arg: any }[] = [];

  static actionsManagers: Record<Namespace, SdkActionManager>;

  static getQueryObject(config: Record<string, string>) {
    config = config || {};
    return {
      ...config,
      // guests is better for API but Booking Page accepts guest. So do the mapping
      // FIXME: Currently multiple guests are expected using guest=1&guest=b approach which is not possible with an object approach
      guest: config.guests ?? "",
    };
  }

  processInstruction(instruction: Instruction) {
    instruction = [].slice.call(instruction, 0);
    if (instruction[0] instanceof Array) {
      // It is an instruction
      instruction.forEach((instruction) => {
        this.processInstruction(instruction);
      });
      return;
    }
    const [method, argument] = instruction;
    if (!this[method]) {
      // Instead of throwing error, log and move forward in the queue
      log(`Instruction ${method} not FOUND`);
    }
    try {
      (this[method] as Function)(argument);
    } catch (e) {
      // Instead of throwing error, log and move forward in the queue
      log(`Instruction couldn't be executed`, e);
    }
    return instruction;
  }

  processQueue(queue: InstructionQueue) {
    queue.forEach((instruction) => {
      this.processInstruction(instruction);
    });

    queue.splice(0);

    /** @ts-ignore */ // We changed the definition of push here.
    queue.push = (instruction) => {
      this.processInstruction(instruction);
    };
  }

  createIframe({
    calendarLink,
    queryObject,
  }: {
    calendarLink: string;
    queryObject?: Record<string, string>;
  }) {
    const iframe = (this.iframe = document.createElement("iframe"));
    // FIXME: scrolling seems deprecated, though it works on Chrome. What's the recommended way to do it?
    iframe.scrolling = "no";
    iframe.className = "cal-embed";
    const config = this.getConfig();
    const searchParams = new URLSearchParams(queryObject);
    const urlInstance = new URL(`${config.origin}/${calendarLink}`);
    urlInstance.searchParams.set("embed", this.namespace);
    //@ts-ignore
    for (let [key, value] of searchParams) {
      urlInstance.searchParams.set(key, value);
    }
    iframe.src = urlInstance.toString();
    return iframe;
  }

  configure({ origin }: { origin: string }) {
    this.__config.origin = origin;
  }

  getConfig() {
    return this.__config;
  }

  inline({
    calendarLink,
    elementOrSelector,
    config,
  }: {
    calendarLink: string;
    elementOrSelector: string | HTMLElement;
    config: Record<string, string>;
  }) {
    const iframe = this.createIframe({ calendarLink, queryObject: Cal.getQueryObject(config) });
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    let element =
      elementOrSelector instanceof HTMLElement
        ? elementOrSelector
        : document.querySelector(elementOrSelector);
    if (!element) {
      throw new Error("Element not found");
    }
    element.appendChild(iframe);
  }

  modal({ calendarLink }: { calendarLink: string }) {
    const iframe = this.createIframe({ calendarLink });
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    const template = document.createElement("template");
    template.innerHTML = `<cal-modal-box></cal-modal-box>`;
    template.content.children[0].appendChild(iframe);
    document.body.appendChild(template.content);
  }

  on({
    action,
    callback,
  }: {
    action: Parameters<SdkActionManager["on"]>[0];
    callback: Parameters<SdkActionManager["on"]>[1];
  }) {
    this.actionManager.on(action, callback);
  }

  //FIXME: Support only path and not fullUrl
  preload({ fullCalendarLink }: { fullCalendarLink: string }) {
    const iframe = document.body.appendChild(document.createElement("iframe"));
    const urlInstance = new URL(fullCalendarLink);
    urlInstance.searchParams.set("prerender", "true");
    iframe.src = urlInstance.toString();
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.display = "none";
  }

  ui(uiConfig: UiConfig) {
    if (!uiConfig) {
      throw new Error("css is required");
    }
    this.doInIframe({ method: "ui", arg: uiConfig });
  }

  doInIframe({
    method,
    arg,
  }: // Need some TypeScript magic here to remove hardcoded types
  | { method: "ui"; arg: Parameters<typeof methods["ui"]>[0] }
    | { method: "parentKnowsIframeReady"; arg: undefined }) {
    if (!this.iframeReady) {
      this.iframeDoQueue.push({ method, arg });
      return;
    }
    // TODO: Ensure that origin is as defined by user. Generally it would be cal.com but in case of self hosting it can be anything.
    this.iframe!.contentWindow!.postMessage({ originator: "CAL", method, arg }, "*");
  }

  constructor(namespace: string, q: InstructionQueue) {
    this.__config = {
      origin: "http://localhost:3000",
    };
    this.namespace = namespace;
    this.actionManager = new SdkActionManager(namespace);

    Cal.actionsManagers = Cal.actionsManagers || {};
    Cal.actionsManagers[namespace] = this.actionManager;

    this.processQueue(q);

    // 1. Initial iframe width and height would be according to 100% value of the parent element
    // 2. Once webpage inside iframe renders, it would tell how much iframe height should be increased so that my entire content is visible without iframe scroll
    // 3. Parent window would check what iframe height can be set according to parent Element
    this.actionManager.on("dimension-changed", (e) => {
      const { data } = e.detail;
      const iframe = this.iframe!;
      if (!iframe) {
        // Iframe might be pre-rendering
        return;
      }
      let proposedHeightByIframeWebsite = parseFloat(getComputedStyle(iframe).height) + data.hiddenHeight;
      iframe.style.height = proposedHeightByIframeWebsite;
    });

    this.actionManager.on("iframeReady", (e) => {
      this.iframeReady = true;
      this.doInIframe({ method: "parentKnowsIframeReady", arg: undefined });
      this.iframeDoQueue.forEach(({ method, arg }) => {
        this.doInIframe({ method, arg });
      });
    });
  }
}

globalCal.instance = new Cal("", globalCal.q!);

for (let [ns, api] of Object.entries(globalCal.ns!)) {
  api.instance = new Cal(ns, api.q!);
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
  if (!actionManager) {
    throw new Error("Unhandled Action" + parsedAction);
  }
  actionManager.fire(parsedAction.type, detail.data);
});

document.addEventListener("click", (e) => {
  const htmlElement = e.target;
  if (!(htmlElement instanceof HTMLElement)) {
    return;
  }
  const path = htmlElement.dataset.calLink;
  if (!path) {
    return;
  }
  // TODO: Add an option to check which cal instance should be used for this.
  globalCal("modal", {
    calendarLink: path,
  });
});

customElements.define("cal-modal-box", ModalBox);
