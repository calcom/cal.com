import type { CalWindow } from "@calcom/embed-snippet";

import { ModalBox } from "./ModalBox";
import { methods, UiConfig } from "./embed-iframe";
import css from "./embed.css";
import { SdkActionManager } from "./sdk-action-manager";

declare module "*.css";

type Namespace = string;
type Config = {
  origin: string;
  debug: 1;
};

const globalCal = (window as CalWindow).Cal;

if (!globalCal || !globalCal.q) {
  throw new Error("Cal is not defined. This shouldn't happen");
}

document.head.appendChild(document.createElement("style")).innerHTML = css;

function log(...args: any[]) {
  console.log(...args);
}
/**
 * A very simple data validator written with intention of keeping payload size low.
 * Extend the functionality of it as required by the embed.
 * @param data
 * @param schema
 */
function validate(data: any, schema: Record<"props" | "required", any>) {
  function checkType(value: any, expectedType: any) {
    if (typeof expectedType === "string") {
      return typeof value == expectedType;
    } else {
      return value instanceof expectedType;
    }
  }

  function isUndefined(data: any) {
    return typeof data === "undefined";
  }

  if (schema.required && isUndefined(data)) {
    throw new Error("Argument is required");
  }

  for (let [prop, propSchema] of Object.entries<Record<"type" | "required", any>>(schema.props)) {
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
    const [method, ...args] = instruction;
    if (!this[method]) {
      // Instead of throwing error, log and move forward in the queue
      log(`Instruction ${method} not FOUND`);
    }
    try {
      (this[method] as Function)(...args);
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
    calLink,
    queryObject = {},
  }: {
    calLink: string;
    queryObject?: Record<string, string | string[]>;
  }) {
    const iframe = (this.iframe = document.createElement("iframe"));
    iframe.className = "cal-embed";
    iframe.name = "cal-embed";
    const config = this.getConfig();

    // Prepare searchParams from config
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryObject)) {
      if (value instanceof Array) {
        value.forEach((val) => searchParams.append(key, val));
      } else {
        searchParams.set(key, value);
      }
    }

    const urlInstance = new URL(`${config.origin}/${calLink}`);
    urlInstance.searchParams.set("embed", this.namespace);
    if (config.debug) {
      urlInstance.searchParams.set("debug", config.debug);
    }

    // Merge searchParams from config onto the URL which might have query params already
    //@ts-ignore
    for (let [key, value] of searchParams) {
      urlInstance.searchParams.append(key, value);
    }
    iframe.src = urlInstance.toString();
    return iframe;
  }

  init(namespaceOrConfig?: string | Config, config: Config = {} as Config) {
    if (typeof namespaceOrConfig !== "string") {
      config = (namespaceOrConfig || {}) as Config;
    }
    if (config?.origin) {
      this.__config.origin = config.origin;
    }
    this.__config.debug = config.debug;
  }

  getConfig() {
    return this.__config;
  }

  // TODO: Maintain exposed methods in a separate namespace, so that unexpected methods don't become instructions

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
    config: Record<string, string>;
  }) {
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
    const iframe = this.createIframe({ calLink, queryObject: Cal.getQueryObject(config) });
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

  modal({ calLink }: { calLink: string }) {
    const iframe = this.createIframe({ calLink });
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
    this.actionManager.on(action, callback);
  }

  preload({ calLink }: { calLink: string }) {
    validate(arguments[0], {
      required: true,
      props: {
        calLink: {
          type: "string",
          required: true,
        },
      },
    });
    const iframe = document.body.appendChild(document.createElement("iframe"));
    const config = this.getConfig();

    const urlInstance = new URL(`${config.origin}/${calLink}`);
    urlInstance.searchParams.set("prerender", "true");
    iframe.src = urlInstance.toString();
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.display = "none";
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

    this.doInIframe({ method: "ui", arg: uiConfig });
  }

  doInIframe({
    method,
    arg,
  }: // TODO: Need some TypeScript magic here to remove hardcoded types
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
      // Keep cal.com hardcoded till the time embed.js deployment to cal.com/embed.js is automated. This is to prevent accidentally pushing of localhost domain to production
      origin: /*import.meta.env.NEXT_PUBLIC_WEBSITE_URL || */ "https://cal.com",
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
      let proposedHeightByIframeWebsite = data.iframeHeight;
      iframe.style.height = proposedHeightByIframeWebsite + "px";
      // It ensures that if the iframe is so tall that it can't fit in the parent window without scroll. Then force the scroll by restricting the max-height to innerHeight
      // This case is reproducible when viewing in ModalBox on Mobile.
      iframe.style.maxHeight = window.innerHeight + "px";
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
    calLink: path,
  });
});

customElements.define("cal-modal-box", ModalBox);
