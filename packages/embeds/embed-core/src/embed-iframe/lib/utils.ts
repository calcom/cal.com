export function runAsap(fn: (...arg: unknown[]) => void) {
  // We don't use rAF because it runs slower in Safari plus doesn't run if the iframe is hidden sometimes
  return setTimeout(fn, 50);
}

export function isBookerPage() {
  return !!window._embedBookerState;
}

export function isBookerReady() {
  return window._embedBookerState === "slotsDone";
}

/**
 * It is important to be able to check realtime(instead of storing isLinkReady as a variable) if the link is ready, because there is a possibility that  booker might have moved to non-ready state from ready state
 */
export function isLinkReady({ embedStore }: { embedStore: typeof import("./embedStore").embedStore }) {
  if (!embedStore.parentInformedAboutContentHeight) {
    return false;
  }

  if (isBookerPage()) {
    // Let's wait for Booker to be ready before showing the embed
    // It means that booker has loaded all its data and is ready to show
    // TODO: We could try to mark the embed as ready earlier in this case not relying on document.readyState
    return isBookerReady();
  }
  return true;
}
