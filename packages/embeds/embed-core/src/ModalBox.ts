export class ModalBox extends HTMLElement {
  static htmlOverflow: string;
  //@ts-ignore
  static get observedAttributes() {
    return ["loading"];
  }

  close() {
    this.shadowRoot!.host.remove();
    document.body.style.overflow = ModalBox.htmlOverflow;
  }
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "loading" && newValue == "done") {
      (this.shadowRoot!.querySelector("#loader")! as HTMLElement).style.display = "none";
    }
  }

  connectedCallback() {
    const closeEl = this.shadowRoot!.querySelector(".close") as HTMLElement;

    document.addEventListener("click", (e) => {
      const el = e.target as HTMLElement;
      this.close();
    });

    closeEl.onclick = () => {
      this.close();
    };
  }

  constructor() {
    super();
    //FIXME: this styling goes as is as it's a JS string. That's a lot of unnecessary whitespaces over the wire.
    const modalHtml = `
		<style>
		.bg-gray-50 {
			--tw-bg-opacity: 1;
			background-color: rgb(248 248 248 / var(--tw-bg-opacity));
		}
		
		.items-center {
			align-items: center;
		}
		.w-full {
			width: 100%;
		}
		.h-screen {
			height: 100%;
		}
		.flex {
			display: flex;
		}
		.z-highest {
			z-index: 500000000;
		}
		.absolute {
			position: absolute;
		}
		.border-brand {
			border-color: white;
		}
		.bg-brand {
			background-color: white;
		}
		
		.backdrop {
		  position:fixed;
		  width:100%;
		  height:100%;
		  top:0;
		  left:0;
		  z-index:99999999;
		  display:block;
		  background-color:rgb(5,5,5, 0.8)
		}
		@media only screen and (min-width:600px) {
		  .modal-box {
			margin:0 auto; 
			border-radius: 8px;
			margin-top:20px; 
			margin-bottom:20px;
			position:absolute;
			width:50%;
			top:50%;
			left:50%;
			transform: translateY(-50%) translateX(-50%);
			overflow: scroll;
		  }
		}
  
		@media only screen and (max-width:600px) {
		  .modal-box {
			width: 100%;
			height: 80%;
			position:fixed;
			top:50px;
			left:0;
			right: 0;
			margin: 0;
		  }
		}
  
		.header {
		  position: relative;
		  float:right;
		  top: 10px;
		}
		.close {
		  font-size: 30px;
		  left: -20px;
		  position: relative;
		  color:white;
		  cursor: pointer;
		}

		@keyframes loader {
			0% {
			transform: rotate(0deg);
			}
		
			25% {
			transform: rotate(180deg);
			}
		
			50% {
			transform: rotate(180deg);
			}
		
			75% {
			transform: rotate(360deg);
			}
		
			100% {
			transform: rotate(360deg);
			}
		}
	
	@keyframes loader-inner {
		0% {
		height: 0%;
		}
	
		25% {
		height: 0%;
		}
	
		50% {
		height: 100%;
		}
	
		75% {
		height: 100%;
		}
	
		100% {
		height: 0%;
		}
	}
		
		.loader-inner {
			vertical-align: top;
			display: inline-block;
			width: 100%;
			animation: loader-inner 2s infinite ease-in;
		}

		.loader {
			display: block;
			width: 30px;
			height: 30px;
			margin: 60px auto;
			position: relative;
			border-width: 4px;
			border-style: solid;
			-webkit-animation: loader 2s infinite ease;
			animation: loader 2s infinite ease;
		}
		</style>
		<div class="backdrop">
		<div class="header">
			  <span class="close">&times;</span>
		  </div>
		  <div class="modal-box">
			<div class="body">
				<div id="loader" class="absolute z-highest flex h-screen w-full items-center">
					<div class="loader border-brand dark:border-darkmodebrand">
						<span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
					</div>
				</div>
				<slot></slot>
			</div>
		  </div>
		</div>
	  `;
    this.attachShadow({ mode: "open" });
    ModalBox.htmlOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.shadowRoot!.innerHTML = modalHtml;
  }
}
