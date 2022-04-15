import loaderCss from "./loader.css";
import tailwindCss from "./tailwind.css";

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
    this.shadowRoot!.innerHTML = `
	<style> ${tailwindCss}${loaderCss}</style>
	<div id="loader" style="left:0;right:0" class="absolute z-highest flex h-screen w-full items-center">
		<div class="loader border-brand dark:border-darkmodebrand">
			<span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
		</div>
	</div>
<slot></slot>
`;
  }
}
