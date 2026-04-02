import type { AllPossibleLayouts, EmbedPageType } from "../types";
import { generateSkeleton } from "../ui/skeleton";
import { type ExternalThemeClass, getInternalThemeClass } from "../ui/themeClass";

const html = ({
  layout = "month_view",
  pageType,
  externalThemeClass,
}: {
  layout?: AllPossibleLayouts;
  pageType: EmbedPageType | null;
  externalThemeClass: ExternalThemeClass;
}) => {
  const { skeletonContent, skeletonContainerStyle, skeletonStyle } = getSkeletonData({
    layout,
    pageType,
  });

  const themeClass = getInternalThemeClass(externalThemeClass);
  return `
<div id="skeleton-container" style="${skeletonContainerStyle}" ${themeClass ? `class="${themeClass}"` : ""}>
  <div id="skeleton" style="${skeletonStyle}" class="absolute z-highest">
    ${skeletonContent}
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

export const getSkeletonData = ({
  layout,
  pageType,
}: {
  layout: AllPossibleLayouts;
  pageType: EmbedPageType | null;
}) => {
  // We keep width 100% for mobile because we want it to take the entire screen width, which it would take because skeletonContainer is taking entire screen width
  const mobileStyleForSkeleton = "width:100%;";
  // We don't do width:100% here because we want skeleton to be centered horizontally and not take the entire screen width in desktop
  const desktopStyleForSkeleton = "left:50%; transform:translate(-50%,0%)";

  const styleForSkeleton = layout === "mobile" ? mobileStyleForSkeleton : desktopStyleForSkeleton;

  // height is set via JS to be same as skeleton inside it
  // Width 100% so that the entire width is available just like for iframe
  const styleForSkeletonContainer = "width:100%;";

  return {
    skeletonContent: generateSkeleton({ layout, pageType }),
    skeletonContainerStyle: styleForSkeletonContainer,
    skeletonStyle: styleForSkeleton,
  };
};
export default html;
