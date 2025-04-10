import loaderCss from "../loader.css?inline";
import { getErrorString } from "../utils";
import inlineHtml from "./inlineHtml";

export class Inline extends HTMLElement {
  static get observedAttributes() {
    return ["loading"];
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  private shouldUseSkeletonLoader() {
    const pageType = this.dataset.calPageType;
    return pageType === "user-event" || pageType === "team-event";
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");
    const skeletonEl = this.shadowRoot.querySelector<HTMLElement>("#skeleton");
    const errorEl = this.shadowRoot.querySelector<HTMLElement>("#error");
    const slotEl = this.shadowRoot.querySelector<HTMLElement>("slot");
    if (!loaderEl || !slotEl || !errorEl || !skeletonEl) {
      throw new Error("One of required elements is missing");
    }
    if (name === "loading") {
      const useSkeletonLoader = this.shouldUseSkeletonLoader();
      if (newValue == "done") {
        loaderEl.style.display = "none";
        skeletonEl.style.display = "none";
      } else if (newValue === "failed") {
        loaderEl.style.display = "none";
        skeletonEl.style.display = "none";
        slotEl.style.visibility = "hidden";
        errorEl.style.display = "block";
        const errorString = getErrorString(this.dataset.errorCode);
        errorEl.innerText = errorString;
      } else {
        // Loading state
        if (useSkeletonLoader) {
          loaderEl.style.display = "none";
          skeletonEl.style.display = "block";
        } else {
          loaderEl.style.display = "block";
          skeletonEl.style.display = "none";
        }
      }
    }
  }
  private getSkeletonEl() {
    return this.shadowRoot?.querySelector<HTMLElement>("#skeleton");
  }

  private getLoaderEl() {
    return this.shadowRoot?.querySelector<HTMLElement>(".loader");
  }

  private getSkeletonContainerEl() {
    return this.shadowRoot?.querySelector<HTMLElement>("#skeleton-container");
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml}`;
    const skeletonEl = this.getSkeletonEl();
    const loaderEl = this.getLoaderEl();
    const skeletonContainerEl = this.getSkeletonContainerEl();
    if (this.shouldUseSkeletonLoader()) {
      if (skeletonEl) {
        skeletonEl.style.visibility = "visible";
        loaderEl.style.display = "none";
        setInterval(() => {
          skeletonContainerEl.style.height = getComputedStyle(skeletonEl).height;
        }, 100);
      }
    } else {
      if (loaderEl) {
        loaderEl.style.display = "block";
        skeletonEl.style.visibility = "hidden";
      }
    }
  }
}
