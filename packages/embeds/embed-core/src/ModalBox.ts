export class ModalBox extends HTMLElement {
  connectedCallback() {
    const closeEl = this.shadowRoot!.querySelector(".close") as HTMLElement;
    closeEl.onclick = () => {
      this.shadowRoot!.host.remove();
    };
  }

  constructor() {
    super();
    //FIXME: this styling goes as is as it's a JS string. That's a lot of unnecessary whitespaces over the wire.
    const modalHtml = `
		<style>
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
			margin-top:20px; 
			margin-bottom:20px;
			position:absolute;
			width:50%;
			height: 80%;
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
		</style>
		<div class="backdrop">
		<div class="header">
			  <span class="close">&times;</span>
		  </div>
		  <div class="modal-box">
			<div class="body">
				<slot></slot>
			</div>
		  </div>
		</div>
	  `;
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = modalHtml;
  }
}
