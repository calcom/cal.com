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

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");
    const errorEl = this.shadowRoot.querySelector<HTMLElement>("#error");
    const slotEl = this.shadowRoot.querySelector<HTMLElement>("slot");
    if (!loaderEl || !slotEl || !errorEl) {
      throw new Error("One of loaderEl, slotEl or errorEl is missing");
    }
    if (name === "loading") {
      if (newValue == "done") {
        loaderEl.style.display = "none";
      } else if (newValue === "failed") {
        loaderEl.style.display = "none";
        slotEl.style.visibility = "hidden";
        errorEl.style.display = "block";
        const errorString = getErrorString(this.dataset.errorCode);
        errorEl.innerText = errorString;
      }
    }
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${inlineHtml}`;
  }
}
