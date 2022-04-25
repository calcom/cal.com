import { CalWindow } from "@calcom/embed-snippet";

import floatingButtonHtml from "./FloatingButtonHtml";

export class FloatingButton extends HTMLElement {
  constructor() {
    super();
    const buttonHtml = `<style>${(window as CalWindow).Cal!.__css}</style> ${floatingButtonHtml}`;
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = buttonHtml;
  }
}
