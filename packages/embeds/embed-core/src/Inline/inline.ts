import { EmbedElement } from "../EmbedElement";
import { getErrorString } from "../lib/utils";
import loaderCss from "../loader.css?inline";
import inlineHtml, { getSkeletonData } from "./inlineHtml";
export class Inline extends EmbedElement {
  static get observedAttributes() {
    return ["loading"];
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
        const errorString = getErrorString({
          errorCode: this.dataset.errorCode,
          errorMessage: this.dataset.message,
        });
        errorEl.innerText = errorString;
      }
    }
  }

  constructor() {
    super({ isModal: false, getSkeletonData });
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml({
      layout: this.layout,
      pageType: this.getPageType() ?? null,
      externalThemeClass: this.themeClass,
    })}`;
  }
}
