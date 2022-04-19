import loaderCss from "../loader.css";
import modalBoxHtml from "./ModalBoxHtml";

export class ModalBox extends HTMLElement {
  static htmlOverflow: string;
  //@ts-ignore
  static get observedAttributes() {
    return ["state"];
  }

  show(show: boolean) {
    // We can't make it display none as that takes iframe width and height calculations to 0
    (this.shadowRoot!.host as unknown as any).style.visibility = show ? "visible" : "hidden";
  }

  close() {
    this.show(false);
    document.body.style.overflow = ModalBox.htmlOverflow;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name !== "state") {
      return;
    }

    if (newValue == "loaded") {
      (this.shadowRoot!.querySelector("#loader")! as HTMLElement).style.display = "none";
    } else if (newValue === "started") {
      this.show(true);
    }
  }

  connectedCallback() {
    const closeEl = this.shadowRoot!.querySelector(".close") as HTMLElement;
    document.addEventListener(
      "keydown",
      (e) => {
        this.close();
      },
      {
        once: true,
      }
    );
    this.shadowRoot!.host.addEventListener("click", (e) => {
      this.close();
    });

    closeEl.onclick = () => {
      this.close();
    };
  }

  constructor() {
    super();
    const modalHtml = `<style>${window.Cal.__css}</style><style>${loaderCss}</style>${modalBoxHtml}`;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.shadowRoot!.innerHTML = modalHtml;
  }
}
