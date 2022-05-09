const html = `<div id="wrapper" style="top:calc(50% - 30px); left:calc(50% - 30px)" class="absolute z-highest">
<div class="loader border-brand dark:border-darkmodebrand">
	<span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
</div>
<div id="error" class="hidden">
Something went wrong.
</div>
</div>
<slot></slot>`;
export default html;
