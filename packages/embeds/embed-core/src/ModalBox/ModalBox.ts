import loaderCss from "../loader.css";
import { getErrorString } from "../utils";
import modalBoxHtml from "./ModalBoxHtml";

type ShadowRootWithStyle = ShadowRoot & {
  host: HTMLElement & { style: CSSStyleDeclaration };
};

export class ModalBox extends HTMLElement {
  static htmlOverflow: string;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return ["state"];
  }

  assertHasShadowRoot(): asserts this is HTMLElement & { shadowRoot: ShadowRootWithStyle } {
    if (!this.shadowRoot) {
      throw new Error("No shadow root");
    }
  }

  show(show: boolean) {
    this.assertHasShadowRoot();
    // We can't make it display none as that takes iframe width and height calculations to 0
    this.shadowRoot.host.style.visibility = show ? "visible" : "hidden";
    if (!show) {
      document.body.style.overflow = ModalBox.htmlOverflow;
    }
  }

  open() {
    this.show(true);
    const event = new Event("open");
    this.dispatchEvent(event);
  }

  close() {
    this.show(false);
    const event = new Event("close");
    this.dispatchEvent(event);
  }

  hideIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      iframe.style.visibility = "hidden";
    }
  }

  showIframe() {
    const iframe = this.querySelector("iframe");
    if (iframe) {
      // Don't use visibility visible as that will make the iframe visible even when the modal is closed
      iframe.style.visibility = "";
    }
  }

  getLoaderElement() {
    this.assertHasShadowRoot();
    const loaderEl = this.shadowRoot.querySelector<HTMLElement>(".loader");

    if (!loaderEl) {
      throw new Error("No loader element");
    }

    return loaderEl;
  }

  getErrorElement() {
    this.assertHasShadowRoot();
    const element = this.shadowRoot.querySelector<HTMLElement>("#error");

    if (!element) {
      throw new Error("No error element");
    }

    return element;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name !== "state") {
      return;
    }

    if (newValue === "loading") {
      this.open();
      this.hideIframe();
      this.getLoaderElement().style.display = "block";
    } else if (newValue == "loaded" || newValue === "reopening") {
      this.open();
      this.showIframe();
      this.getLoaderElement().style.display = "none";
    } else if (newValue == "closed") {
      this.close();
    } else if (newValue === "failed") {
      this.getLoaderElement().style.display = "none";
      this.getErrorElement().style.display = "inline-block";
      const errorString = getErrorString(this.dataset.errorCode);
      this.getErrorElement().innerText = errorString;
    } else if (newValue === "prerendering") {
      this.close();
    }
  }

  connectedCallback() {
    this.assertHasShadowRoot();
    const closeEl = this.shadowRoot.querySelector<HTMLElement>(".close");
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          this.close();
        }
      },
      {
        once: true,
      }
    );
    this.shadowRoot.host.addEventListener("click", () => {
      this.close();
    });

    if (closeEl) {
      closeEl.onclick = () => {
        this.close();
      };
    }
  }

  constructor() {
    super();
    const modalHtml = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${modalBoxHtml}`;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.open();
    this.assertHasShadowRoot();
    this.shadowRoot.innerHTML = modalHtml;
  }
}
