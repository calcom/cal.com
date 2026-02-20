import { renderSkeleton } from "../../skeleton/builder";
import type { LayoutOption, PageKind } from "../../types/shared";

export function inlineSkeletonData({
  layout,
  pageKind,
}: {
  layout: LayoutOption;
  pageKind: PageKind | null;
}) {
  const mobile = layout === "mobile";
  return {
    skeletonContent: renderSkeleton({ layout, pageKind }),
    skeletonContainerStyle: "width:100%;",
    skeletonStyle: mobile ? "width:100%;" : "left:50%; transform:translate(-50%,0%)",
  };
}

export function makeInlineHtml({
  layout = "month_view",
  pageKind,
}: {
  layout?: LayoutOption;
  pageKind: PageKind | null;
}): string {
  const { skeletonContent, skeletonContainerStyle, skeletonStyle } = inlineSkeletonData({ layout, pageKind });

  return (
    `<div id="skeleton-container" style="${skeletonContainerStyle}">` +
    `<div id="skeleton" style="${skeletonStyle}" class="absolute z-highest">${skeletonContent}</div>` +
    `<div id="wrapper" style="top:50%; left:50%; transform:translate(-50%,-50%)" class="absolute z-highest">` +
    `<div class="loader border-brand-default dark:border-darkmodebrand">` +
    `<span class="loader-inner bg-brand dark:bg-darkmodebrand"></span></div>` +
    `<div id="error" style="transform:translate(-50%,-50%)" class="hidden">Something went wrong.</div>` +
    `</div></div><slot></slot>`
  );
}
