import { makeFloatingHtml } from "./template";

type ModalAttrs = {
  calLink: string;
  calNamespace: string;
  calOrigin: string;
  calConfig: string;
};

const OBSERVED = [
  "data-button-text",
  "data-hide-button-icon",
  "data-button-position",
  "data-button-color",
  "data-button-text-color",
  "data-toggle-off",
] as const;

type DataAttr = (typeof OBSERVED)[number];

type CamelCase<T extends string> = T extends `${infer U}${infer V}` ? `${Uppercase<U>}${V}` : T;
type HyphenToCamel<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${HyphenToCamel<CamelCase<U>>}`
  : CamelCase<S>;
type DataToCamel<S extends string> = S extends `data-${infer U}` ? HyphenToCamel<U> : S;
type DatasetType = { [K in DataToCamel<DataAttr>]: string };

export type FloatingButtonDataset = DatasetType;

function getElements(root: ShadowRoot) {
  const btnEl = root.querySelector<HTMLElement>("#button");
  const wrapEl = root.querySelector<HTMLElement>("button");
  const iconEl = root.querySelector<HTMLElement>("#button-icon");
  if (!btnEl) throw new Error("#button not found");
  if (!wrapEl) throw new Error("button wrapper not found");
  if (!iconEl) throw new Error("#button-icon not found");
  return { btnEl, wrapEl, iconEl };
}

export class FloatingButton extends HTMLElement {
  static computePositionClasses(position: string, existing: string): string {
    const cleaned = existing.replace(/hidden|md:right-10|md:left-10|left-4|right-4/g, "");
    const cls = position === "bottom-right" ? "md:right-10 right-4" : "md:left-10 left-4";
    return [cleaned, cls].join(" ");
  }

  dataset!: DOMStringMap & FloatingButtonDataset & ModalAttrs;
  savedDisplay!: HTMLElement["style"]["display"];

  static get observedAttributes() {
    return OBSERVED;
  }

  attributeChangedCallback(attr: DataAttr, _prev: string, val: string): void {
    if (!this.shadowRoot) return;
    const { btnEl, wrapEl, iconEl } = getElements(this.shadowRoot);

    const handlers: Partial<Record<DataAttr, () => void>> = {
      "data-button-text": () => {
        btnEl.textContent = val;
      },
      "data-hide-button-icon": () => {
        iconEl.style.display = val === "true" ? "none" : "block";
      },
      "data-button-position": () => {
        wrapEl.className = FloatingButton.computePositionClasses(val, wrapEl.className);
      },
      "data-button-color": () => {
        wrapEl.style.backgroundColor = val;
      },
      "data-button-text-color": () => {
        wrapEl.style.color = val;
      },
      "data-toggle-off": () => {
        const off = val === "true";
        if (off) this.savedDisplay = wrapEl.style.display;
        wrapEl.style.display = off ? "none" : this.savedDisplay;
      },
    };

    handlers[attr]?.();
  }

  assertShadow(): asserts this is HTMLElement & { shadowRoot: ShadowRoot } {
    if (!this.shadowRoot) throw new Error("No shadow root");
  }

  constructor() {
    super();
    const ds = this.dataset as FloatingButtonDataset;
    const markup = `<style>${window.Cal.__css}</style>${makeFloatingHtml({
      label: ds["buttonText"],
      classes: [FloatingButton.computePositionClasses(ds["buttonPosition"], "")],
      bgColor: ds["buttonColor"],
      textColor: ds["buttonTextColor"],
    })}`;
    this.attachShadow({ mode: "open" });
    this.assertShadow();
    this.shadowRoot.innerHTML = markup;
  }
}
