import type { BookerLayouts, EmbedPageType } from "../types";
import { generateSkeleton } from "../ui/skeleton";

const html = ({
  layout = "month_view",
  pageType,
}: {
  layout?: BookerLayouts;
  pageType: EmbedPageType | null;
}) => `
<div id="skeleton-container">
	<div id="skeleton" style="left:50%; transform:translate(-50%,0%)" class="absolute z-highest">
		${generateSkeleton({ layout, pageType: pageType })}
	</div>
  <div id="wrapper" style="top:50%; left:50%; transform:translate(-50%,-50%)" class="absolute z-highest">
    <div class="loader border-brand-default dark:border-darkmodebrand">
      <span class="loader-inner bg-brand dark:bg-darkmodebrand"></span>
    </div>
    <div id="error" style="transform:translate(-50%,-50%)" class="hidden">
      Something went wrong.
    </div>
  </div>
</div>
<slot></slot>
`;
export default html;
