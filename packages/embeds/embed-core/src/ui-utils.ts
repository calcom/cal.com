import type { BookerLayouts, EmbedPageType } from "./types";

export function getMaxHeightForModal() {
  const spacingTopPlusBottom = 2 * 50; // 50 is the padding we want to keep to show close button comfortably. Make it same as top for bottom.
  // It ensures that if the iframe is so tall that it can't fit in the parent window without scroll. Then force the scroll by restricting the max-height to innerHeight
  // This case is reproducible when viewing in ModalBox on Mobile.
  return window.innerHeight - spacingTopPlusBottom;
}

export const toggleLoader = ({
  skeletonEl,
  loaderEl,
  skeletonContainerEl,
  pageType,
  show,
  isModal,
}: {
  skeletonEl: HTMLElement;
  loaderEl: HTMLElement;
  skeletonContainerEl: HTMLElement;
  pageType: EmbedPageType | null;
  isModal: boolean;
  show: boolean;
}) => {
  function ensureContainerTakesSkeletonHeight() {
    // skeletonEl is absolute positioned, so, we manually adjust the height of the Skeleton Container, so that the content around it doesn't do layout shift when actual iframe appears in its place
    const heightOfSkeleton = parseFloat(getComputedStyle(skeletonEl).height);
    if (isModal) {
      skeletonContainerEl.style.maxHeight = `${getMaxHeightForModal()}px`;
      skeletonContainerEl.style.height = `${heightOfSkeleton}px`;
    } else {
      const heightOfIframeByDefault = 300;
      const diff = heightOfSkeleton - heightOfIframeByDefault;
      if (heightOfSkeleton) {
        if (diff > 0) {
          // Skeleton is positioned over the iframe(hidden with height of 300px already) so we add to container height only the difference
          skeletonContainerEl.style.height = `${diff}px`;
        }
      } else {
        // We will be here when skeleton is display:none
        skeletonContainerEl.style.height = "0px";
      }
    }
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

function matchesMediaQuery(query: string) {
  return window.matchMedia(query).matches;
}

export function getLayout({ layout }: { layout: BookerLayouts | null }) {
  const isMobile = matchesMediaQuery("(max-width: 768px)");
  if (isMobile) {
    return "mobile";
  }
  return layout;
}
