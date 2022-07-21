const html = `<style>
.my-backdrop {
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
    width:100%;
    top:50%;
    left:50%;
    transform: translateY(-50%) translateX(-50%);
    overflow: auto;
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
/*Modal background is black only, so hardcode white */
.loader {
  --cal-brand-color:white;
}
</style>
<div class="my-backdrop">
<div class="header">
  <span class="close">&times;</span>
</div>
<div class="modal-box">
  <div class="body">
    <div id="wrapper" class="z-[999999999999] absolute flex w-full items-center">
      <div class="loader modal-loader border-brand dark:border-darkmodebrand">
        <span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
      </div>
      </div>
    <div id="error" class="hidden left-1/2 -translate-x-1/2 relative text-white"></div>
    <slot></slot>
  </div>
</div>
</div>`;

export default html;
