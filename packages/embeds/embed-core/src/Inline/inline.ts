import { CalWindow } from "@calcom/embed-snippet";

import loaderCss from "../loader.css";
import inlineHtml from "./inlineHtml";

export class Inline extends HTMLElement {
  //@ts-ignore
  static get observedAttributes() {
    return ["loading"];
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "loading" && newValue == "done") {
      (this.shadowRoot!.querySelector("#loader")! as HTMLElement).style.display = "none";
    }
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `<style>${
      (window as CalWindow).Cal!.__css
    }</style><style>${loaderCss}</style>${inlineHtml}`;
  }
}
