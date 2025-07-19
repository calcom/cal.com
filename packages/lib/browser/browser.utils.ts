import { sdkActionManager } from "@calcom/embed-core/embed-iframe";

type BrowserInfo = {
  url: string;
  path: string;
  referrer: string;
  title: string;
  query: string;
  origin: string;
};

export const getBrowserInfo = (): Partial<BrowserInfo> => {
  if (typeof window === "undefined") {
    return {};
  }
  return {
    url: window.document.location?.href ?? undefined,
    path: window.document.location?.pathname ?? undefined,
    referrer: window.document?.referrer ?? undefined,
    title: window.document.title ?? undefined,
    query: window.document.location?.search,
    origin: window.document.location?.origin,
  };
};

export const isSafariBrowser = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome");
};

/**
 * Asks parent to scroll to an element inside iframe.
 * This is a workaround for Safari iframe scrolling behavior and so isn't recommended to be used by external consumers.
 */
const askParentToScrollToElement = (element: HTMLElement): void => {
  const elementRect = element.getBoundingClientRect();
  const elementTop = elementRect.top;
  sdkActionManager?.fire("__scrollByDistance", {
    distance: elementTop,
  });
};

const afterNthPaintCycle = (n: number, callback: () => void): void => {
  requestAnimationFrame(() => {
    if (n === 1) {
      callback();
      return;
    }
    requestAnimationFrame(() => afterNthPaintCycle(n - 1, callback));
  });
};

/**
 * Cross-browser compatible scrollIntoView with Safari iframe support
 */
export const scrollIntoViewSmooth = (element: HTMLElement, isEmbed = false): void => {
  const currentPosition = element.getBoundingClientRect().top;
  // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed
  element.scrollIntoView({ behavior: "smooth" });
  if (!isEmbed) {
    return;
  }
  const mightNeedSafariWorkaround = isSafariBrowser();

  // First paint cycle will actually start scrolling the element.
  // So, we need to wait for the second paint cycle to guarantee that the element is scrolled some amount.
  afterNthPaintCycle(2, () => {
    const newPosition = element.getBoundingClientRect().top;
    const didScroll = currentPosition !== newPosition;
    const scrollWorkaroundNeeded = mightNeedSafariWorkaround && !didScroll;
    if (!scrollWorkaroundNeeded) {
      return;
    }

    askParentToScrollToElement(element);
  });
};
