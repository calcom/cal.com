import loaderCss from "../../loader.css?inline";
import { buildErrorMessage } from "../../utils/params";
import { EmbedWidgetBase } from "../base";
import { makeInlineHtml, inlineSkeletonData } from "./template";

function getInlineElements(root: ShadowRoot) {
  const errEl = root.querySelector<HTMLElement>("#error");
  const slotEl = root.querySelector<HTMLElement>("slot");
  if (!slotEl || !errEl) throw new Error("Missing slot or error element");
  return { errEl, slotEl };
}

export class Inline extends EmbedWidgetBase {
  static get observedAttributes() {
    return ["loading"];
  }

  attributeChangedCallback(name: string, _old: string, next: string): void {
    this.assertShadow();
    if (name !== "loading") return;

    const { errEl, slotEl } = getInlineElements(this.shadowRoot);

    if (next === "done") {
      this.toggleLoader(false);
    } else if (next === "failed") {
      this.toggleLoader(false);
      slotEl.style.visibility = "hidden";
      errEl.style.display = "block";
      errEl.innerText = buildErrorMessage({
        errorCode: this.dataset.errorCode,
        errorMessage: this.dataset.message,
      });
    }
  }

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super({ modal: false, skeletonProvider: inlineSkeletonData as any });
    this.attachShadow({ mode: "open" });
    this.assertShadow();
    this.shadowRoot.innerHTML = [
      `<style>${window.Cal.__css}</style>`,
      `<style>${loaderCss}</style>`,
      makeInlineHtml({ layout: this.getLayout(), pageKind: this.getPageKind() ?? null }),
    ].join("");
  }
}
