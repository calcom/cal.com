import { CalWindow } from "../embed";
import loaderCss from "../loader.css";
import { getErrorString } from "../utils";
import modalBoxHtml from "./ModalBoxHtml";

export class ModalBox extends HTMLElement {
  static htmlOverflow: string;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  static get observedAttributes() {
    return ["state"];
  }

  show(show: boolean) {
    // We can't make it display none as that takes iframe width and height calculations to 0
    (this.shadowRoot!.host as unknown as any).style.visibility = show ? "visible" : "hidden";
    if (!show) {
      document.body.style.overflow = ModalBox.htmlOverflow;
    }
  }

  close() {
    this.show(false);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name !== "state") {
      return;
    }

    if (newValue == "loaded") {
      (this.shadowRoot!.querySelector(".loader")! as HTMLElement).style.display = "none";
    } else if (newValue === "started") {
      this.show(true);
    } else if (newValue == "closed") {
      this.show(false);
    } else if (newValue === "failed") {
      (this.shadowRoot!.querySelector(".loader")! as HTMLElement).style.display = "none";
      (this.shadowRoot!.querySelector("#error")! as HTMLElement).style.display = "inline-block";
      const errorString = getErrorString(this.dataset.errorCode);
      (this.shadowRoot!.querySelector("#error")! as HTMLElement).innerText = errorString;
    }
  }

  connectedCallback() {
    const closeEl = this.shadowRoot!.querySelector(".close") as HTMLElement;
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
    this.shadowRoot!.host.addEventListener("click", () => {
      this.close();
    });

    closeEl.onclick = () => {
      this.close();
    };
  }

  constructor() {
    super();
    const modalHtml = `<style>${
      (window as CalWindow).Cal!.__css
    }</style><style>${loaderCss}</style>${modalBoxHtml}`;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.shadowRoot!.innerHTML = modalHtml;
  }
}
