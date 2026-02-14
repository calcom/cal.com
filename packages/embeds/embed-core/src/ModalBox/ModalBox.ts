import { EmbedElement } from "../EmbedElement";
import { getErrorString } from "../lib/utils";
import loaderCss from "../loader.css?inline";
import modalBoxHtml, { getSkeletonData } from "./ModalBoxHtml";

export class ModalBox extends EmbedElement {
  static htmlOverflow: string;

  private escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this.close();
    }
  };

  static get observedAttributes() {
    return ["state"];
  }

  /**
   * Show the modal box, regardless of anything else - Kind of like forced open
   */
  show(show: boolean) {
    this.assertHasShadowRoot();
    // We can't make it display none as that takes iframe width and height calculations to 0
    this.shadowRoot.host.style.visibility = show ? "visible" : "hidden";
    if (!show) {
      document.body.style.overflow = ModalBox.htmlOverflow;
    }
  }

  /**
   * Open the modal box if it makes sense to do so.
   */
  open() {
    if (this.getAttribute("state") === "prerendering") {
      // You can't show a modal thats prerendering or prerendered
      return;
    }
    this.show(true);
    const event = new Event("open");
    this.dispatchEvent(event);
  }

  private isLoaderRunning() {
    const state = this.getAttribute("state");
    return !state || state === "loading";
  }

  /**
   * Close the modal box - It is like a forced close
   */
  private explicitClose() {
    this.show(false);
    const event = new Event("close");
    this.dispatchEvent(event);
  }

  isShowingMessage() {
    const currentState = this.getAttribute("state");
    return currentState === "has-message" || currentState === "failed";
  }

  /**
   * Close the modal box if it makes sense to do so.
   */
  close() {
    // We want to avoid accidentally closing the modal through Esc, Click outside, etc.
    if (this.isLoaderRunning() || this.isShowingMessage()) {
      return;
    }
    this.explicitClose();
  }

  /**
   * Takes the iframe out of layout and hides it
   */
  collapseIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      iframe.style.display = "none";
    }
  }

  /**
   * Put the iframe back in layout and make it visible
   */
  uncollapseIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      // Resets the display to its default value
      iframe.style.display = "";
    }
  }

  /**
   * Make the iframe invisible but stays in layout
   */
  makeIframeInvisible() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      iframe.style.visibility = "hidden";
    }
  }

  /**
   * Make the iframe visible, doesn't affect layout
   *
   * Iframe on creation is invisible
   */
  makeIframeVisible() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      // Don't use visibility visible as that will make the iframe visible even when the modal is closed
      iframe.style.visibility = "";
    }
  }

  getMessageElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#message");

    if (!element) {
      throw new Error("No message element");
    }

    return element;
  }

  getMessageContainerElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#message-container");

    if (!element) {
      throw new Error("No message container element");
    }

    return element;
  }

  toggleMessageElement(show: boolean) {
    const errorContainerElement = this.getMessageContainerElement();
    if (show) {
      errorContainerElement.style.display = "";
    } else {
      errorContainerElement.style.display = "none";
    }
  }

  ensureIframeFullyVisible() {
    // Iframe when added is invisible, so we ensure that it is visible
    this.makeIframeVisible();
    // Iframe is collapsed(doesn't take any space) when error is to be shown, so we ensure that it is uncollapsed
    this.uncollapseIframe();
  }

  /**
   * Called when the state is "loaded"
   */
  onStateLoaded() {
    // Hide Loader
    this.toggleLoader(false);
    // Message is shown either in "failed" or "has-message" state, so we hide it here
    this.toggleMessageElement(false);

    // Open Modal
    this.open();
    // Ensure Iframe is fully visible
    this.ensureIframeFullyVisible();
  }

  /**
   * Called when the state is "failed" or "has-message"
   */
  onStateFailedOrMessage() {
    this.toggleLoader(false);
    this.toggleMessageElement(true);
    this.collapseIframe();

    const message = this.dataset.message;
    const errorMessage = this.dataset.errorCode
      ? getErrorString({
          errorCode: this.dataset.errorCode,
          errorMessage: message,
        })
      : null;
    const messageToShow = errorMessage || message;
    if (messageToShow) {
      this.getMessageElement().innerText = messageToShow;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name !== "state") {
      return;
    }

    if (newValue === "loading") {
      this.toggleLoader(true);
      this.open();

      // Ensure iframe takes its available space as it could be possible that we are moving from "failed" state to "loading" state or some other case.
      this.uncollapseIframe();
      this.toggleMessageElement(false);

      // Keep iframe invisible as it will be made visible when the state changes to "loaded"
      this.makeIframeInvisible();
    } else if (newValue == "loaded") {
      this.onStateLoaded();
    } else if (newValue == "closed") {
      this.explicitClose();
    } else if (newValue === "failed" || newValue === "has-message") {
      this.onStateFailedOrMessage();
    } else if (newValue === "prerendering") {
      // We do a close here because we don't want the loaders to show up when the modal is prerendering
      // As per HTML, both skeleton/loader are configured to be shown by default, so we need to hide them and infact we don't want to show up anything unexpected so we completely hide the customElement itself
      this.explicitClose();
    } else if (newValue === "reopened") {
      // Show in whatever state it is
      this.open();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.assertHasShadowRoot();
    const closeEl = this.shadowRoot.querySelector<HTMLElement>(".close");
    document.addEventListener("keydown", this.escHandler);

    // The backdrop is inside the host element, and a click on host element is only possible if the user clicks outside the iframe.
    // So, it is backdrop click handler
    this.shadowRoot.host.addEventListener("click", () => {
      this.close();
    });

    if (closeEl) {
      closeEl.onclick = () => {
        this.explicitClose();
      };
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.escHandler);
  }

  constructor() {
    super({ isModal: true, getSkeletonData });
    const modalHtml = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${modalBoxHtml({
      layout: this.getLayout(),
      pageType: this.getPageType() ?? null,
      externalThemeClass: this.themeClass,
    })}`;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.open();
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = modalHtml;
  }
}
