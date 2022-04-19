const html = `<div id="loader" style="left:0;right:0" class="absolute z-highest flex h-screen w-full items-center">
<div class="loader border-brand dark:border-darkmodebrand">
	<span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
</div>
</div>
<slot></slot>`;
export default html;
