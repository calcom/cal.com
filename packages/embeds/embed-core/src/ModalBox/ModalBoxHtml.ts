const html = `<style>
.my-backdrop {
  position:fixed;
  width:100%;
  height:100%;
  top:0;
  left:0;
  z-index:999999999999;
  display:block;
  background-color:rgb(5,5,5, 0.8)
}

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
    <div id="wrapper" class="">
        <div class="loader bg-default dark:bg-muted relative mx-auto h-screen max-h-[460px] w-full max-w-[760px] rounded-lg border">
          <div class="grid h-screen grid-cols-1 sm:grid-cols-3">
            <div class="h-screen max-h-[460px] border-0 p-4 sm:border-r">
              <div class="h-6 w-6 animate-pulse rounded-full"></div>
              <div class="mt-2">
                <div class="bg-emphasis inline-block h-4 w-32 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-20 animate-pulse rounded-md"></div>
              </div>
              <div>
                <div class="bg-emphasis mt-1 inline-block h-6 w-20 animate-pulse rounded-md"></div>
              </div>
              <div class="mt-4">
                <div class="bg-emphasis inline-block h-24 w-full animate-pulse rounded-md"></div>
              </div>
              <div class="mt-4">
                <div class="bg-emphasis inline-block h-4 w-4 animate-pulse rounded-full"></div>
                <div class="bg-emphasis inline-block h-4 w-20 animate-pulse rounded-md"></div>
              </div>
              <div class="mt-1">
                <div class="bg-emphasis inline-block h-4 w-4 animate-pulse rounded-full"></div>
                <div class="bg-emphasis inline-block h-4 w-24 animate-pulse rounded-md"></div>
              </div>
              <div class="mt-1">
                <div class="bg-emphasis inline-block h-4 w-4 animate-pulse rounded-full"></div>
                <div class="bg-emphasis inline-block h-4 w-12 animate-pulse rounded-md"></div>
              </div>
            </div>

            <div class="col-span-2 px-10 pt-4">
              <div class="mt-2">
                <div class="bg-emphasis inline-block h-4 w-12 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-20 animate-pulse rounded-md"></div>
              </div>

              <div class="text-emphasis my-4 grid grid-cols-7 gap-4 text-xs font-medium uppercase tracking-widest text-gray-600">
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-4 w-full animate-pulse rounded-md"></div>
              </div>
              <div class="grid grid-cols-7 gap-4">
                <div class="inline-block h-10 w-10 animate-pulse rounded-md bg-transparent"></div>
                <div class="inline-block h-10 w-10 animate-pulse rounded-md bg-transparent"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md opacity-30"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md opacity-30"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md opacity-30"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md opacity-30"></div>
                <div class="bg-emphasis inline-block h-10 w-10 animate-pulse rounded-md opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    <div id="error" class="hidden left-1/2 -translate-x-1/2 relative text-inverted"></div>
    <slot></slot>
  </div>
</div>
</div>`;

export default html;
