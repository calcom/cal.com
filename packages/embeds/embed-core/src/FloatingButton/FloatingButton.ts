import type { CalWindow } from "../embed";
import getFloatingButtonHtml from "./FloatingButtonHtml";

export class FloatingButton extends HTMLElement {
  static updatedClassString(position: string, classString: string) {
    return [
      classString.replace(/hidden|md:right-10|md:left-10|left-4|right-4/g, ""),
      position === "bottom-right" ? "md:right-10 right-4" : "md:left-10 left-4",
    ].join(" ");
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return [
      "data-button-text",
      "data-hide-button-icon",
      "data-button-position",
      "data-button-color",
      "data-button-text-color",
    ];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "data-button-text") {
      const buttonEl = this.shadowRoot?.querySelector("#button");
      if (!buttonEl) {
        throw new Error("Button not found");
      }
      buttonEl.innerHTML = newValue;
    } else if (name === "data-hide-button-icon") {
      const buttonIconEl = this.shadowRoot?.querySelector("#button-icon") as HTMLElement;
      if (!buttonIconEl) {
        throw new Error("Button not found");
      }
      buttonIconEl.style.display = newValue == "true" ? "none" : "block";
    } else if (name === "data-button-position") {
      const buttonEl = this.shadowRoot?.querySelector("button") as HTMLElement;
      if (!buttonEl) {
        throw new Error("Button not found");
      }
      buttonEl.className = FloatingButton.updatedClassString(newValue, buttonEl.className);
    } else if (name === "data-button-color") {
      const buttonEl = this.shadowRoot?.querySelector("button") as HTMLElement;
      if (!buttonEl) {
        throw new Error("Button not found");
      }
      buttonEl.style.backgroundColor = newValue;
    } else if (name === "data-button-text-color") {
      const buttonEl = this.shadowRoot?.querySelector("button") as HTMLElement;
      if (!buttonEl) {
        throw new Error("Button not found");
      }
      buttonEl.style.color = newValue;
    }
  }
  constructor() {
    super();
    const buttonText = this.dataset["buttonText"];
    const buttonPosition = this.dataset["buttonPosition"];
    const buttonColor = this.dataset["buttonColor"];
    const buttonTextColor = this.dataset["buttonTextColor"];

    //TODO: Logic is duplicated over HTML generation and attribute change, keep it at one place
    const buttonHtml = `<style>${(window as CalWindow).Cal!.__css}</style> ${getFloatingButtonHtml({
      buttonText: buttonText!,
      buttonClasses: [FloatingButton.updatedClassString(buttonPosition!, "")],
      buttonColor: buttonColor!,
      buttonTextColor: buttonTextColor!,
    })}`;
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = buttonHtml;
  }
}
