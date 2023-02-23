import loaderCss from "../loader.css";
import { getErrorString } from "../utils";
import inlineHtml from "./inlineHtml";

export class Inline extends HTMLElement {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return ["loading"];
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "loading") {
      if (newValue == "done") {
        this.shadowRoot!.querySelector<HTMLElement>(".loader")!.style.display = "none";
      } else if (newValue === "failed") {
        this.shadowRoot!.querySelector<HTMLElement>(".loader")!.style.display = "none";
        this.shadowRoot!.querySelector<HTMLElement>("#error")!.style.display = "block";
        this.shadowRoot!.querySelector<HTMLElement>("slot")!.style.visibility = "hidden";
        const errorString = getErrorString(this.dataset.errorCode);
        this.shadowRoot!.querySelector<HTMLElement>("#error")!.innerText = errorString;
      }
    }
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `<style>${
      window.Cal!.__css
    }</style><style>${loaderCss}</style>${inlineHtml}`;
  }
}
