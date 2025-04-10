import type { EmbedPageType } from "./types";

export const toggleLoader = ({
  skeletonEl,
  loaderEl,
  skeletonContainerEl,
  pageType,
  show,
}: {
  skeletonEl: HTMLElement;
  loaderEl: HTMLElement;
  skeletonContainerEl: HTMLElement;
  pageType: EmbedPageType | null;
  show: boolean;
}) => {
  function ensureContainerTakesSkeletonHeight() {
    // skeletonEl is absolute positioned, so, we manually adjust the height of the Skeleton Container, so that the content around it doesn't do layout shift when actual iframe appears in its place
    skeletonContainerEl.style.height = getComputedStyle(skeletonEl).height;
    requestAnimationFrame(ensureContainerTakesSkeletonHeight);
  }

  const supportsSkeleton = !!pageType;

  if (!supportsSkeleton) {
    loaderEl.style.display = show ? "block" : "none";
    skeletonEl.style.display = "none";
  } else {
    requestAnimationFrame(ensureContainerTakesSkeletonHeight);
    skeletonEl.style.display = show ? "block" : "none";
    loaderEl.style.display = "none";
  }
};
