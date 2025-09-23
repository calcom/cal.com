import getFloatingButtonHtml from "./FloatingButtonHtml";

type ModalTargetDatasetProps = {
  calLink: string;
  calNamespace: string;
  calOrigin: string;
  calConfig: string;
};

type CamelCase<T extends string> = T extends `${infer U}${infer V}` ? `${Uppercase<U>}${V}` : T;

type HyphenatedStringToCamelCase<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${HyphenatedStringToCamelCase<CamelCase<U>>}`
  : CamelCase<S>;

type HyphenatedDataStringToCamelCase<S extends string> = S extends `data-${infer U}`
  ? HyphenatedStringToCamelCase<U>
  : S;

const dataAttributes = [
  "data-button-text",
  "data-hide-button-icon",
  "data-button-position",
  "data-button-color",
  "data-button-text-color",
  "data-toggle-off",
  "data-auto-open-delay",
  "data-chatbox-title",
] as const;

type DataAttributes = (typeof dataAttributes)[number];
type DataAttributesCamelCase = HyphenatedDataStringToCamelCase<DataAttributes>;

export type FloatingButtonDataset = {
  [key in DataAttributesCamelCase]: string;
};

export class FloatingButton extends HTMLElement {
  static updatedClassString(position: string, classString: string) {
    return [
      classString.replace(/hidden|md:right-10|md:left-10|left-4|right-4/g, ""),
      position === "bottom-right" ? "md:right-10 right-4" : "md:left-10 left-4",
    ].join(" ");
  }

  // Button added here triggers the modal on click. So, it has to have the same data attributes as the modal target as well
  dataset!: DOMStringMap & FloatingButtonDataset & ModalTargetDatasetProps;
  buttonWrapperStyleDisplay!: HTMLElement["style"]["display"];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return dataAttributes;
  }

  attributeChangedCallback(name: DataAttributes, oldValue: string, newValue: string) {
    const buttonEl = this.shadowRoot?.querySelector<HTMLElement>("#button");
    const buttonWrapperEl = this.shadowRoot?.querySelector<HTMLElement>("button");
    const buttonIconEl = this.shadowRoot?.querySelector<HTMLElement>("#button-icon");

    if (!buttonEl) {
      throw new Error("#button not found");
    }
    if (!buttonWrapperEl) {
      throw new Error("button element not found");
    }
    if (!buttonIconEl) {
      throw new Error("#button-icon not found");
    }

    if (name === "data-button-text") {
      buttonEl.textContent = newValue;
    } else if (name === "data-hide-button-icon") {
      buttonIconEl.style.display = newValue == "true" ? "none" : "block";
    } else if (name === "data-button-position") {
      buttonWrapperEl.className = FloatingButton.updatedClassString(newValue, buttonWrapperEl.className);
    } else if (name === "data-button-color") {
      buttonWrapperEl.style.backgroundColor = newValue;
    } else if (name === "data-button-text-color") {
      buttonWrapperEl.style.color = newValue;
    } else if (name === "data-toggle-off") {
      const off = newValue == "true";
      if (off) {
        // When toggling off, back up the original display value so that it can be restored when toggled back on
        this.buttonWrapperStyleDisplay = buttonWrapperEl.style.display;
      }
      buttonWrapperEl.style.display = off ? "none" : this.buttonWrapperStyleDisplay;
    } else {
      console.log("Unknown attribute changed", name, oldValue, newValue);
    }
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  constructor() {
    super();
    const dataset = this.dataset as FloatingButtonDataset;
    const buttonText = dataset["buttonText"] || "Book a Meeting";
    const buttonPosition = dataset["buttonPosition"] || "bottom-right";
    const buttonColor = dataset["buttonColor"] || "rgb(0, 0, 0)";
    const buttonTextColor = dataset["buttonTextColor"] || "rgb(255, 255, 255)";

    console.log("FloatingButton constructor - dataset:", dataset);
    console.log("FloatingButton constructor - colors:", { buttonColor, buttonTextColor });

    //TODO: Logic is duplicated over HTML generation and attribute change, keep it at one place
    const buttonHtml = `<style>${window.Cal.__css}</style> ${getFloatingButtonHtml({
      buttonText: buttonText,
      buttonClasses: [FloatingButton.updatedClassString(buttonPosition, "")],
      buttonColor: buttonColor,
      buttonTextColor: buttonTextColor,
    })}`;

    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = buttonHtml;

    this.initializeChatbox();
  }

  private initializeChatbox() {
    this.assertHasShadowRoot();

    console.log("Initializing chatbox, shadow root:", this.shadowRoot);
    console.log("Shadow root HTML:", this.shadowRoot.innerHTML);

    const chatboxContainer = this.shadowRoot.querySelector("#chatbox-container") as HTMLElement;
    const fabButton = this.shadowRoot.querySelector("#fab-button") as HTMLElement;
    const closeBtn = this.shadowRoot.querySelector("#close-btn") as HTMLElement;
    const fullscreenBtn = this.shadowRoot.querySelector("#fullscreen-btn") as HTMLElement;
    const chatbox = this.shadowRoot.querySelector("#chatbox") as HTMLElement;

    console.log("Found elements:", { chatboxContainer, fabButton, closeBtn, fullscreenBtn, chatbox });

    let isOpen = false;
    let hasAutoOpened = false;
    let isFullscreen = false;

    const autoOpenDelay = parseInt(this.dataset.autoOpenDelay || "4000");

    setTimeout(() => {
      if (!hasAutoOpened) {
        this.openChatbox();
        hasAutoOpened = true;
        isOpen = true;
      }
    }, autoOpenDelay);

    fabButton?.addEventListener("click", () => {
      if (isOpen) {
        this.closeChatbox();
        isOpen = false;
      } else {
        this.openChatbox();
        isOpen = true;
        if (!hasAutoOpened) {
          hasAutoOpened = true;
        }
      }
    });

    closeBtn?.addEventListener("click", () => {
      this.closeChatbox();
      isOpen = false;
    });

    fullscreenBtn?.addEventListener("click", () => {
      this.toggleFullscreen();
      isFullscreen = !isFullscreen;
    });
  }

  private openChatbox() {
    this.assertHasShadowRoot();
    const chatboxContainer = this.shadowRoot.querySelector("#chatbox-container") as HTMLElement;
    const fabButton = this.shadowRoot.querySelector("#fab-button") as HTMLElement;

    if (chatboxContainer) {
      chatboxContainer.style.visibility = "visible";
      chatboxContainer.style.opacity = "1";
      chatboxContainer.style.transform = "translateY(0)";
    }

    const fabIcon = this.shadowRoot.querySelector("#fab-icon") as HTMLElement;
    if (fabIcon) {
      fabIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>`;
    }

    if (fabButton && window.innerWidth < 768) {
      fabButton.style.opacity = "0";
      fabButton.style.pointerEvents = "none";
    }

    this.loadBookingIframe();
  }

  private closeChatbox() {
    this.assertHasShadowRoot();
    const chatboxContainer = this.shadowRoot.querySelector("#chatbox-container") as HTMLElement;
    const fabButton = this.shadowRoot.querySelector("#fab-button") as HTMLElement;

    if (chatboxContainer) {
      chatboxContainer.style.visibility = "hidden";
      chatboxContainer.style.opacity = "0";
      chatboxContainer.style.transform = "translateY(8px)";
    }

    const fabIcon = this.shadowRoot.querySelector("#fab-icon") as HTMLElement;
    if (fabIcon) {
      fabIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>`;
    }

    if (fabButton) {
      fabButton.style.opacity = "1";
      fabButton.style.pointerEvents = "auto";
    }
  }

  private toggleFullscreen() {
    this.assertHasShadowRoot();
    const chatbox = this.shadowRoot.querySelector("#chatbox") as HTMLElement;
    const fullscreenIcon = this.shadowRoot.querySelector("#fullscreen-icon") as HTMLElement;

    if (chatbox) {
      const isCurrentlyFullscreen = chatbox.classList.contains("md:w-[1050px]");

      if (isCurrentlyFullscreen) {
        chatbox.classList.remove("md:w-[1050px]");
        chatbox.classList.add("md:w-96");
        if (fullscreenIcon) {
          fullscreenIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>`;
        }
      } else {
        chatbox.classList.remove("md:w-96");
        chatbox.classList.add("md:w-[1050px]");
        if (fullscreenIcon) {
          fullscreenIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h6v6m-6-6l6 6m6-6h-6V3m6 6L9 3"></path>`;
        }
      }
    }
  }

  private loadBookingIframe() {
    this.assertHasShadowRoot();
    const iframeContainer = this.shadowRoot.querySelector("#iframe-container") as HTMLElement;

    if (iframeContainer && !iframeContainer.querySelector("iframe")) {
      const iframe = document.createElement("iframe");
      iframe.src = this.buildBookingUrl();
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.borderRadius = "0 0 8px 8px";

      iframeContainer.appendChild(iframe);
    }
  }

  private buildBookingUrl(): string {
    const calLink = this.dataset.calLink;
    const calOrigin = this.dataset.calOrigin || window.location.origin;
    const calConfig = this.dataset.calConfig;

    const url = `${calOrigin}/${calLink}`;

    const params = new URLSearchParams({
      embedType: "floating-popup",
      embed: "true",
    });

    if (calConfig) {
      try {
        const config = JSON.parse(calConfig);
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === "string") {
            params.append(key, value);
          }
        });
      } catch (e) {
        console.warn("Failed to parse cal config:", e);
      }
    }

    return `${url}?${params.toString()}`;
  }
}
