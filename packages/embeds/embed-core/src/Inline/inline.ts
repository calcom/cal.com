import loaderCss from "../loader.css?inline";
import type { AllPossibleLayouts, BookerLayouts, EmbedPageType } from "../types";
import { toggleLoader, getTrueLayout } from "../ui-utils";
import { getErrorString } from "../utils";
import inlineHtml, { getSkeletonData } from "./inlineHtml";

export class Inline extends HTMLElement {
  static get observedAttributes() {
    return ["loading"];
  }

  private layout!: AllPossibleLayouts;
  private boundResizeHandler: (this: Inline) => void;

  private getPageType(): EmbedPageType | undefined {
    return this.dataset.pageType as EmbedPageType | undefined;
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  private getLayout(): AllPossibleLayouts {
    return getTrueLayout({ layout: (this.dataset.layout as BookerLayouts | undefined) ?? null });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.assertHasShadowRoot();
    const errorEl = this.shadowRoot.querySelector<HTMLElement>("#error");
    const slotEl = this.shadowRoot.querySelector<HTMLElement>("slot");
    if (!slotEl || !errorEl) {
      throw new Error("One of loaderEl, slotEl or errorEl is missing");
    }
    if (name === "loading") {
      if (newValue == "done") {
        this.toggleLoader(false);
      } else if (newValue === "failed") {
        this.toggleLoader(false);
        slotEl.style.visibility = "hidden";
        errorEl.style.display = "block";
        const errorString = getErrorString(this.dataset.errorCode);
        errorEl.innerText = errorString;
      }
    }
  }
  private getSkeletonElement(): HTMLElement {
    this.assertHasShadowRoot();
    const skeletonEl = this.shadowRoot.querySelector<HTMLElement>("#skeleton");
    if (!skeletonEl) {
      throw new Error("Skeleton element is not found");
    }
    return skeletonEl;
  }

  private getLoaderElement(): HTMLElement {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");
    if (!loaderEl) {
      throw new Error("Loader element is not found");
    }
    return loaderEl;
  }

  private getSkeletonContainerElement(): HTMLElement {
    this.assertHasShadowRoot();
    const skeletonContainerEl = this.shadowRoot.querySelector<HTMLElement>("#skeleton-container");
    if (!skeletonContainerEl) {
      throw new Error("Skeleton container element is not found");
    }
    return skeletonContainerEl;
  }

  private toggleLoader(show: boolean) {
    toggleLoader({
      skeletonEl: this.getSkeletonElement(),
      loaderEl: this.getLoaderElement(),
      skeletonContainerEl: this.getSkeletonContainerElement(),
      pageType: this.getPageType() ?? null,
      show,
      isModal: false,
    });
  }

  constructor() {
    console.log("Inline constructor called"); // Added by Cursor AI

    super();
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.layout = this.getLayout();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml({
      layout: this.layout,
      pageType: this.getPageType() ?? null,
    })}`;
    this.toggleLoader(true);
    // Bind the handler once and store it
    this.boundResizeHandler = this.resizeHandler.bind(this);
  }

  connectedCallback() {
    // Add the event listener when the element is connected to the DOM
    window.addEventListener("resize", this.boundResizeHandler);
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
