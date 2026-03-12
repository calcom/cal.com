import loaderCss from "../../loader.css";
import { buildErrorMessage } from "../../utils/params";
import { EmbedWidgetBase } from "../base";
import { makeModalHtml, modalSkeletonData } from "./template";

type ModalState = "loading" | "loaded" | "closed" | "failed" | "has-message" | "prerendering" | "reopened";

function findIframe(host: Element): HTMLIFrameElement | null {
  return host.querySelector("iframe");
}

export class ModalBox extends EmbedWidgetBase {
  static savedOverflow: string;

  static get observedAttributes() {
    return ["state"];
  }

  forceVisibility(show: boolean): void {
    this.assertShadow();
    this.shadowRoot.host.style.visibility = show ? "visible" : "hidden";
    if (!show) document.body.style.overflow = ModalBox.savedOverflow;
  }

  tryOpen(): void {
    if (this.getAttribute("state") === "prerendering") return;
    this.forceVisibility(true);
    this.dispatchEvent(new Event("open"));
  }

  private isLoading(): boolean {
    const s = this.getAttribute("state");
    return !s || s === "loading";
  }

  private forceClose(): void {
    this.forceVisibility(false);
    this.dispatchEvent(new Event("close"));
  }

  hasMessage(): boolean {
    const s = this.getAttribute("state");
    return s === "has-message" || s === "failed";
  }

  tryClose(): void {
    if (this.isLoading() || this.hasMessage()) return;
    this.forceClose();
  }

  hideIframe(): void {
    const f = findIframe(this);
    if (f) f.style.display = "none";
  }

  showIframe(): void {
    const f = findIframe(this);
    if (f) f.style.display = "";
  }

  dimIframe(): void {
    const f = findIframe(this);
    if (f) f.style.visibility = "hidden";
  }

  revealIframe(): void {
    const f = findIframe(this);
    if (f) f.style.visibility = "";
  }

  private getMessageEl(): HTMLElement {
    this.assertShadow();
    const el = this.shadowRoot.querySelector<HTMLElement>("#message");
    if (!el) throw new Error("No message element");
    return el;
  }

  private getMessageContainer(): HTMLElement {
    this.assertShadow();
    const el = this.shadowRoot.querySelector<HTMLElement>("#message-container");
    if (!el) throw new Error("No message container element");
    return el;
  }

  private setMessageVisible(show: boolean): void {
    this.getMessageContainer().style.display = show ? "" : "none";
  }

  private prepareFrame(): void {
    this.revealIframe();
    this.showIframe();
  }

  private handleLoaded(): void {
    this.toggleLoader(false);
    this.setMessageVisible(false);
    this.tryOpen();
    this.prepareFrame();
  }

  private handleFailedOrMessage(): void {
    this.toggleLoader(false);
    this.setMessageVisible(true);
    this.hideIframe();
    const errMsg = this.dataset.errorCode
      ? buildErrorMessage({ errorCode: this.dataset.errorCode, errorMessage: this.dataset.message })
      : null;
    const text = errMsg || this.dataset.message;
    if (text) this.getMessageEl().innerText = text;
  }

  private readonly stateHandlers: Partial<Record<ModalState, () => void>> = {
    loading: () => {
      this.toggleLoader(true);
      this.tryOpen();
      this.showIframe();
      this.setMessageVisible(false);
      this.dimIframe();
    },
    loaded: () => this.handleLoaded(),
    closed: () => this.forceClose(),
    failed: () => this.handleFailedOrMessage(),
    "has-message": () => this.handleFailedOrMessage(),
    prerendering: () => this.forceClose(),
    reopened: () => this.tryOpen(),
  };

  attributeChangedCallback(name: string, _old: string, next: string): void {
    if (name !== "state") return;
    this.stateHandlers[next as ModalState]?.();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.assertShadow();

    const closeBtn = this.shadowRoot.querySelector<HTMLElement>(".close");
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") this.tryClose();
      },
      { once: true }
    );
    this.shadowRoot.host.addEventListener("click", () => this.tryClose());
    if (closeBtn) closeBtn.onclick = () => this.forceClose();
  }

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super({ modal: true, skeletonProvider: modalSkeletonData as any });
    const markup = [
      `<style>${window.Cal.__css}</style>`,
      `<style>${loaderCss}</style>`,
      makeModalHtml({ layout: this.getLayout(), pageKind: this.getPageKind() ?? null }),
    ].join("");
    this.attachShadow({ mode: "open" });
    ModalBox.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.tryOpen();
    this.assertShadow();
    this.shadowRoot.innerHTML = markup;
  }
}
