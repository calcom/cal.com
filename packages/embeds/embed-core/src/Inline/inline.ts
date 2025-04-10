import loaderCss from "../loader.css?inline";
import { toggleLoader } from "../ui-utils";
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
    return pageType === "user.event.booking" || pageType === "team.event.booking";
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
      if (newValue == "done") {
        this.toggleLoader(false);
      } else if (newValue === "failed") {
        this.toggleLoader(false);
        slotEl.style.visibility = "hidden";
        errorEl.style.display = "block";
        const errorString = getErrorString(this.dataset.errorCode);
        errorEl.innerText = errorString;
      } else {
        // Loading state
        this.toggleLoader(true);
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

  private toggleLoader(show: boolean) {
    toggleLoader({
      skeletonEl: this.getSkeletonEl(),
      loaderEl: this.getLoaderEl(),
      skeletonContainerEl: this.getSkeletonContainerEl(),
      useSkeletonLoader: this.shouldUseSkeletonLoader(),
      show,
    });
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml}`;
    this.toggleLoader(true);
  }
}
