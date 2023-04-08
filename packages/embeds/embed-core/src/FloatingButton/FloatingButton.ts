import getFloatingButtonHtml from "./FloatingButtonHtml";

type ModalTargetDatasetProps = {
  calLink: string;
  calNamespace: string;
  calOrigin: string;
};

type CamelCase<T extends string> = T extends `${infer U}${infer V}` ? `${Uppercase<U>}${V}` : T;

type HyphenatedStringToCamelCase<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${HyphenatedStringToCamelCase<CamelCase<U>>}`
  : CamelCase<S>;

type HyphenatedDataStringToCamelCase<S extends string> = S extends `data-${infer U}`
  ? HyphenatedStringToCamelCase<U>
  : S;

const dataAttributes = [
  "data-button-text",
  "data-hide-button-icon",
  "data-button-position",
  "data-button-color",
  "data-button-text-color",
] as const;

type DataAttributes = (typeof dataAttributes)[number];
type DataAttributesCamelCase = HyphenatedDataStringToCamelCase<DataAttributes>;

export type FloatingButtonDataset = {
  [key in DataAttributesCamelCase]: string;
};

export class FloatingButton extends HTMLElement {
  static updatedClassString(position: string, classString: string) {
    return [
      classString.replace(/hidden|md:right-10|md:left-10|left-4|right-4/g, ""),
      position === "bottom-right" ? "md:right-10 right-4" : "md:left-10 left-4",
    ].join(" ");
  }

  // Button added here triggers the modal on click. So, it has to have the same data attributes as the modal target as well
  dataset!: DOMStringMap & FloatingButtonDataset & ModalTargetDatasetProps;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return dataAttributes;
  }

  attributeChangedCallback(name: DataAttributes, oldValue: string, newValue: string) {
    const buttonEl = this.shadowRoot?.querySelector<HTMLElement>("#button");
    const buttonWrapperEl = this.shadowRoot?.querySelector<HTMLElement>("button");
    const buttonIconEl = this.shadowRoot?.querySelector<HTMLElement>("#button-icon");

    if (!buttonEl) {
      throw new Error("#button not found");
    }
    if (!buttonWrapperEl) {
      throw new Error("button element not found");
    }
    if (!buttonIconEl) {
      throw new Error("#button-icon not found");
    }

    if (name === "data-button-text") {
      buttonEl.textContent = newValue;
    } else if (name === "data-hide-button-icon") {
      buttonIconEl.style.display = newValue == "true" ? "none" : "block";
    } else if (name === "data-button-position") {
      buttonWrapperEl.className = FloatingButton.updatedClassString(newValue, buttonWrapperEl.className);
    } else if (name === "data-button-color") {
      buttonWrapperEl.style.backgroundColor = newValue;
    } else if (name === "data-button-text-color") {
      buttonWrapperEl.style.color = newValue;
    } else {
      console.log("Unknown attribute changed", name, oldValue, newValue);
    }
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  constructor() {
    super();
    const dataset = this.dataset as FloatingButtonDataset;
    const buttonText = dataset["buttonText"];
    const buttonPosition = dataset["buttonPosition"];
    const buttonColor = dataset["buttonColor"];
    const buttonTextColor = dataset["buttonTextColor"];

    //TODO: Logic is duplicated over HTML generation and attribute change, keep it at one place
    const buttonHtml = `<style>${window.Cal.__css}</style> ${getFloatingButtonHtml({
      buttonText: buttonText,
      buttonClasses: [FloatingButton.updatedClassString(buttonPosition, "")],
      buttonColor: buttonColor,
      buttonTextColor: buttonTextColor,
    })}`;

    this.attachShadow({ mode: "open" });
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = buttonHtml;
  }
}
