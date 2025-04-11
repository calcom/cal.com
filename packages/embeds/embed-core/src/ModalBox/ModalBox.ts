import loaderCss from "../loader.css";
import type { AllPossibleLayouts, BookerLayouts, EmbedPageType } from "../types";
import { getTrueLayout, toggleLoader } from "../ui-utils";
import { getErrorString } from "../utils";
import modalBoxHtml, { getSkeletonData } from "./ModalBoxHtml";

type ShadowRootWithStyle = ShadowRoot & {
  host: HTMLElement & { style: CSSStyleDeclaration };
};

export class ModalBox extends HTMLElement {
  static htmlOverflow: string;
  private layout!: AllPossibleLayouts;
  private boundResizeHandler: (this: ModalBox) => void;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return ["state"];
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRootWithStyle } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  private getPageType(): EmbedPageType {
    return this.dataset.pageType as EmbedPageType;
  }

  show(show: boolean) {
    this.assertHasShadowRoot();
    // We can't make it display none as that takes iframe width and height calculations to 0
    this.shadowRoot.host.style.visibility = show ? "visible" : "hidden";
    if (!show) {
      document.body.style.overflow = ModalBox.htmlOverflow;
    }
  }

  open() {
    this.show(true);
    const event = new Event("open");
    this.dispatchEvent(event);
  }

  private isLoaderRunning() {
    const state = this.getAttribute("state");
    return !state || state === "loading" || state === "reopening";
  }

  private explicitClose() {
    this.show(false);
    const event = new Event("close");
    this.dispatchEvent(event);
  }

  close() {
    if (this.isLoaderRunning()) {
      return;
    }
    this.explicitClose();
  }

  hideIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      iframe.style.visibility = "hidden";
    }
  }

  showIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      // Don't use visibility visible as that will make the iframe visible even when the modal is closed
      iframe.style.visibility = "";
    }
  }

  getLoaderElement(): HTMLElement {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");

    if (!loaderEl) {
      throw new Error("No loader element");
    }

    return loaderEl;
  }

  getSkeletonElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#skeleton");
    if (!element) {
      throw new Error("No skeleton element");
    }
    return element;
  }

  getErrorElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#error");

    if (!element) {
      throw new Error("No error element");
    }

    return element;
  }

  getSkeletonContainerElement(): HTMLElement {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#skeleton-container");
    if (!element) {
      throw new Error("No skeleton container element");
    }
    return element;
  }

  toggleLoader(show: boolean) {
    toggleLoader({
      skeletonEl: this.getSkeletonElement(),
      loaderEl: this.getLoaderElement(),
      skeletonContainerEl: this.getSkeletonContainerElement(),
      pageType: this.getPageType(),
      show,
      isModal: true,
    });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name !== "state") {
      return;
    }

    if (newValue === "loading") {
      this.open();
      this.hideIframe();
      this.toggleLoader(true);
    } else if (newValue == "loaded" || newValue === "reopening") {
      this.open();
      this.showIframe();
      this.toggleLoader(false);
    } else if (newValue == "closed") {
      this.explicitClose();
    } else if (newValue === "failed") {
      this.getLoaderElement().style.display = "none";
      this.getSkeletonElement().style.display = "none";
      this.getErrorElement().style.display = "inline-block";
      const errorString = getErrorString(this.dataset.errorCode);
      this.getErrorElement().innerText = errorString;
    } else if (newValue === "prerendering") {
      this.explicitClose();
    }
  }

  connectedCallback() {
    this.assertHasShadowRoot();
    const closeEl = this.shadowRoot.querySelector<HTMLElement>(".close");
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          this.close();
        }
      },
      {
        once: true,
      }
    );

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

    // Add the event listener when the element is connected to the DOM
    window.addEventListener("resize", this.boundResizeHandler);
  }

  private getLayout(): AllPossibleLayouts {
    return getTrueLayout({ layout: (this.dataset.layout as BookerLayouts | undefined) ?? null });
  }

  constructor() {
    super();
    const modalHtml = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${modalBoxHtml({
      layout: this.getLayout(),
      pageType: this.getPageType() ?? null,
    })}`;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.open();
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = modalHtml;
    this.toggleLoader(true);
    // Bind the handler once and store it
    this.boundResizeHandler = this.resizeHandler.bind(this);
  }

  disconnectedCallback() {
    // Remove the event listener when the element is disconnected from the DOM
    window.removeEventListener("resize", this.boundResizeHandler);
  }

  private resizeHandler() {
    const newLayout = this.getLayout();
    if (newLayout !== this.layout) {
      this.layout = newLayout;
      const { skeletonContent, skeletonContainerStyle, skeletonStyle } = getSkeletonData({
        layout: this.layout,
        pageType: this.getPageType() ?? null,
      });

      const skeletonContainerEl = this.getSkeletonContainerElement();
      const skeletonEl = this.getSkeletonElement();

      skeletonContainerEl.setAttribute("style", skeletonContainerStyle);
      skeletonEl.setAttribute("style", skeletonStyle);

      skeletonEl.innerHTML = skeletonContent;
    }
  }
}
