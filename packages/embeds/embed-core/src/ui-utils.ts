export const toggleLoader = ({
  skeletonEl,
  loaderEl,
  skeletonContainerEl,
  useSkeletonLoader,
  show,
}: {
  skeletonEl: HTMLElement;
  loaderEl: HTMLElement;
  skeletonContainerEl: HTMLElement;
  useSkeletonLoader: boolean;
  show: boolean;
}) => {
  const displayDefaultLoader = !useSkeletonLoader && show;
  const displaySkeleton = show && useSkeletonLoader;

  if (displaySkeleton) {
    requestAnimationFrame(ensureAppropriateHeight);

    function ensureAppropriateHeight() {
      skeletonContainerEl.style.height = getComputedStyle(skeletonEl).height;
      requestAnimationFrame(ensureAppropriateHeight);
    }
  }
  loaderEl.style.display = displayDefaultLoader ? "block" : "none";
  skeletonEl.style.display = displaySkeleton ? "block" : "none";
};
