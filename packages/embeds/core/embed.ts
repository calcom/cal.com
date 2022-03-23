import { SdkEventManager } from "./sdk-event-manager";

const globalCal = window.Cal;

//TODO: Move it to a CSS file and import
const css = `
	.cal-embed {
		border: 0px;
	}
`;
document.head.appendChild(document.createElement("style")).innerHTML = css;

// FIXME: See how we want to manage the UI. If the UI is not complex we can go for Web Components - We get the automatic benefit of Style Encapsulation
class ModalBox {
  element: HTMLElement;
  open() {
    this.element.style.display = "block";
  }

  close() {
    this.element.style.display = "none";
  }

  constructor({ contentEl, style }) {
    const modalBox = document.body.appendChild(document.createElement("div"));
    style = style || {};
    modalBox.className = "cal-embed-modal-box";
    // FIXME: Ensure better implementation of modal box.
    modalBox.style.position = "fixed";
    modalBox.style.width = "100%";
    modalBox.style.height = "100%";
    modalBox.style.top = "0";
    modalBox.style.left = "0";
    modalBox.style.zIndex = "99999999";
    modalBox.style.display = "none";
    modalBox.style.backgroundColor = "rgba(0,0,0,0.4)";
    const contentElWrapper = modalBox.appendChild(document.createElement("div"));
    contentElWrapper.style.margin = "0 auto";
    contentElWrapper.style.marginTop = "20px";
    contentElWrapper.style.marginBottom = "20px";
    contentElWrapper.style.width = "80%";
    this.element = modalBox;
    contentElWrapper.appendChild(contentEl);
  }
}

function log(...args) {
  console.log(...args);
}

class Cal {
  static getQueryObject(config) {
    config = config || {};
    return {
      ...config,
      // guests is better for API but Booking Page accepts guest. So do the mapping
      // FIXME: Currently multiple guests are expected using guest=1&guest=b approach which is not possible with an object approach
      guest: config.guests,
    };
  }
  processInstruction(instruction) {
    const [method, argument] = instruction;
    if (!this[method]) {
      // Instead of throwing error, log and move forward in the queue
      log(`Instruction ${method} not found`);
    }
    try {
      this[method](argument);
    } catch (e) {
      // Instead of throwing error, log and move forward in the queue
      log(`Instruction couldn't be executed`, e);
    }
  }

  processQueue(queue) {
    queue.forEach((instruction) => {
      this.processInstruction(instruction);
    });

    queue.splice(0);

    queue.push = (instruction) => {
      this.processInstruction(instruction);
    };
  }

  createIframe({ calendarLink, queryObject }) {
    const iframe = (this.iframe = document.createElement("iframe"));
    // FIXME: scrolling seems deprecated, though it works on Chrome. What's the recommended way to do it?
    iframe.scrolling = "no";
    iframe.className = "cal-embed";
    const config = this.getConfig();
    const searchParams = new URLSearchParams(queryObject);
    const urlInstance = new URL(`${config.origin}/${calendarLink}`);
    urlInstance.searchParams.set("embed", this.namespace);
    for (let [key, value] of searchParams) {
      urlInstance.searchParams.set(key, value);
    }
    iframe.src = urlInstance.toString();
    return iframe;
  }

  configure({ origin }) {
    this.__config.origin = origin;
  }

  getConfig() {
    return this.__config;
  }

  inline({ calendarLink, elementOrSelector, config }) {
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

  modal({ calendarLink, style }) {
    const iframe = this.createIframe({ calendarLink });
    style = style || {};
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    this.modalBox = this.modalBox || new ModalBox({ contentEl: iframe, style });
    this.modalBox.open();
  }

  on({ action, callback }) {
    this.actionManager.on(action, callback);
  }

  //FIXME: Support only path and not fullUrl
  preload({ fullCalendarLink }) {
    const iframe = document.body.appendChild(document.createElement("iframe"));
    const urlInstance = new URL(fullCalendarLink);
    urlInstance.searchParams.set("prerender", "true");
    iframe.src = urlInstance.toString();
    iframe.style.width = 0;
    iframe.style.height = 0;
    iframe.style.display = "none";
  }

  constructor(namespace, q) {
    this.__config = {
      origin: "http://localhost:3000",
    };

    this.namespace = namespace;
    this.actionManager = new SdkEventManager(namespace);
    Cal.actionManagers = Cal.actionManagers || {};
    Cal.actionManagers[namespace] = this.actionManager;
    this.processQueue(q);
    function setAppropriateHeight({ iframe, proposedHeightByIframeWebsite }) {
      iframe.style.height = proposedHeightByIframeWebsite;
    }
    // 1. Initial iframe width and height would be according to 100% value of the parent element
    // 2. Once webpage inside iframe renders, it would tell how much iframe height should be increased so that my entire content is visible without iframe scroll
    // 3. Parent window would check what iframe height can be set according to parent Element
    this.actionManager.on("dimension-changed", (e) => {
      const { data } = e.detail;
      const iframe = this.iframe;
      if (!iframe) {
        // Iframe might be pre-rendering
        return;
      }
      let proposedHeightByIframeWebsite =
        parseFloat(getComputedStyle(this.iframe).height) + data.hiddenHeight;
      setAppropriateHeight({ iframe, proposedHeightByIframeWebsite });
    });
  }
}

globalCal.instance = new Cal("", globalCal.q);

for (let [ns, api] of Object.entries(globalCal.ns)) {
  api.instance = new Cal(ns, api.q);
}

/**
 * Intercepts all postmessages and fires action in corresponding actionManager
 */
window.addEventListener("message", (e) => {
  const detail = e.data;
  const fullType = detail.fullType;
  const parsedAction = SdkEventManager.parseAction(fullType);
  if (!parsedAction) {
    return;
  }
  const actionManager = Cal.actionManagers[parsedAction.ns];
  if (!actionManager) {
    throw new Error("Unhandled Action", parsedAction);
  }
  actionManager.fire(parsedAction.type, detail.data);
});

document.addEventListener("click", (e) => {
  const path = e.target.dataset.calLink;
  if (!path) {
    return;
  }
  // TODO: Add an option to check which cal instance should be used for this.
  globalCal("modal", {
    calendarLink: path,
  });
});
