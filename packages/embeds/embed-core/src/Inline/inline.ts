import loaderCss from "../loader.css?inline";
import type { BookerLayouts, EmbedPageType } from "../types";
import { toggleLoader } from "../ui-utils";
import { getErrorString } from "../utils";
import inlineHtml from "./inlineHtml";

export class Inline extends HTMLElement {
  static get observedAttributes() {
    return ["loading"];
  }

  private getPageType(): EmbedPageType | undefined {
    return this.dataset.pageType as EmbedPageType | undefined;
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  private getLayout(): BookerLayouts {
    return this.dataset.layout as BookerLayouts;
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
  private getSkeletonEl(): HTMLElement {
    this.assertHasShadowRoot();
    const skeletonEl = this.shadowRoot.querySelector<HTMLElement>("#skeleton");
    if (!skeletonEl) {
      throw new Error("Skeleton element is not found");
    }
    return skeletonEl;
  }

  private getLoaderEl(): HTMLElement {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");
    if (!loaderEl) {
      throw new Error("Loader element is not found");
    }
    return loaderEl;
  }

  private getSkeletonContainerEl(): HTMLElement {
    this.assertHasShadowRoot();
    const skeletonContainerEl = this.shadowRoot.querySelector<HTMLElement>("#skeleton-container");
    if (!skeletonContainerEl) {
      throw new Error("Skeleton container element is not found");
    }
    return skeletonContainerEl;
  }

  private toggleLoader(show: boolean) {
    toggleLoader({
      skeletonEl: this.getSkeletonEl(),
      loaderEl: this.getLoaderEl(),
      skeletonContainerEl: this.getSkeletonContainerEl(),
      pageType: this.getPageType() ?? null,
      show,
      isModal: false,
    });
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml({
      layout: this.getLayout(),
      pageType: this.getPageType() ?? null,
    })}`;
    this.toggleLoader(true);
  }
}
