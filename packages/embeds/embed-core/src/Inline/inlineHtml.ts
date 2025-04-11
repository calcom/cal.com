import type { BookerLayouts, EmbedPageType } from "../types";
import { getLayout } from "../ui-utils";
import { generateSkeleton } from "../ui/skeleton";

const html = ({
  layout = "month_view",
  pageType,
}: {
  layout?: BookerLayouts;
  pageType: EmbedPageType | null;
}) => {
  const trueLayout = getLayout({ layout });
  // We keep width 100% for mobile because we want it to take the entire screen width, which it would take because skeletonContainer is taking entire screen width
  const mobileStyleForSkeleton = "width:100%;";
  // We don't do width:100% here because we want skeleton to be centered horizontally and not take the entire screen width in desktop
  const desktopStyleForSkeleton = "left:50%; transform:translate(-50%,0%)";

  const styleForSkeleton = trueLayout === "mobile" ? mobileStyleForSkeleton : desktopStyleForSkeleton;

  // height is set via JS to be same as skeleton inside it
  // Width 100% so that the entire width is available just like for iframe
  const styleForSkeletonContainer = "width:100%;";
  return `
<div id="skeleton-container" style="${styleForSkeletonContainer}">
	<div id="skeleton" style="${styleForSkeleton}" class="absolute z-highest">
		${generateSkeleton({ layout: trueLayout, pageType: pageType })}
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
};
export default html;
