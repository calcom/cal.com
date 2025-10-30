import { sdkActionManager } from "../../sdk-event";
import { type EmbedStore } from "../lib/embedStore";

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

function isSkeletonSupportedPageType() {
  const url = new URL(document.URL);
  const pageType = url.searchParams.get("cal.embed.pageType");
  // Any non-empty pageType is skeleton supported because generateSkeleton()
  // will generate a skeleton for it (either specific or fallback to default)
  return !!pageType;
}

/**
 * It is important to be able to check realtime(instead of storing isLinkReady as a variable) if the link is ready, because there is a possibility that  booker might have moved to non-ready state from ready state
 */
export function isLinkReady({ embedStore }: { embedStore: EmbedStore }) {
  if (!embedStore.providedCorrectHeightToParent) {
    return false;
  }

  if (isBookerPage()) {
    if (isSkeletonSupportedPageType()) {
      // Let's wait for Booker to be ready before showing the embed as there is already a skeleton loader being shown and we don't really need to show the booker's actual skeleton
      // Booker's actual skeleton shows event-type description and other details too but it could cause the UX to be bad if we show two different skeletons one by one and they might not overlap well
      return isBookerReady();
    } else {
      // For regular loader (non-skeleton), don't wait for slots to be complete before toggling off the loader
      return true;
    }
  }
  return true;
}

/**
 * This function is called once the iframe loads.
 * It isn't called on "connect"
 *
 * Two-pass dimension strategy:
 * 1. Initial pass: Uses document scroll dimensions to provide maximum space and avoid affecting layout
 * 2. Second pass: Updates with correct dimensions of main container after parent adjusts iframe
 *
 * The correct iframe height is only available after the second pass, so we mark providedCorrectHeightToParent=true
 * when the second pass runs (regardless of whether dimensions changed or not).
 */
export function keepParentInformedAboutDimensionChanges({ embedStore }: { embedStore: EmbedStore }) {
  let knownIframeHeight: number | null = null;
  let knownIframeWidth: number | null = null;
  let isInitialDimensionPass = true;
  let isWindowLoadComplete = false;
  runAsap(function informAboutScroll() {
    if (document.readyState !== "complete") {
      // Wait for window to load to correctly calculate the initial scroll height.
      runAsap(informAboutScroll);
      return;
    }

    if (!isWindowLoadComplete) {
      // On Safari, even though document.readyState is complete, still the page is not rendered and we can't compute documentElement.scrollHeight correctly
      // Postponing to just next cycle allow us to fix this.
      setTimeout(() => {
        isWindowLoadComplete = true;
        informAboutScroll();
      }, 100);
      return;
    }

    if (!embedStore.windowLoadEventFired) {
      sdkActionManager?.fire("__windowLoadComplete", {});
    }
    embedStore.windowLoadEventFired = true;

    // Use the dimensions of main element as in most places there is max-width restriction on it and we just want to show the main content.
    // It avoids the unwanted padding outside main tag.
    const mainElement =
      document.getElementsByClassName("main")[0] ||
      document.getElementsByTagName("main")[0] ||
      document.documentElement;
    const documentScrollHeight = document.documentElement.scrollHeight;
    const documentScrollWidth = document.documentElement.scrollWidth;

    if (!(mainElement instanceof HTMLElement)) {
      throw new Error("Main element should be an HTMLElement");
    }

    const mainElementStyles = getComputedStyle(mainElement);
    // Use, .height as that gives more accurate value in floating point. Also, do a ceil on the total sum so that whatever happens there is enough iframe size to avoid scroll.
    const contentHeight = Math.ceil(
      parseFloat(mainElementStyles.height) +
        parseFloat(mainElementStyles.marginTop) +
        parseFloat(mainElementStyles.marginBottom)
    );
    const contentWidth = Math.ceil(
      parseFloat(mainElementStyles.width) +
        parseFloat(mainElementStyles.marginLeft) +
        parseFloat(mainElementStyles.marginRight)
    );

    // During first render let iframe tell parent that how much is the expected height to avoid scroll.
    // Parent would set the same value as the height of iframe which would prevent scroll.
    // On subsequent renders, consider html height as the height of the iframe. If we don't do this, then if iframe gets bigger in height, it would never shrink
    const iframeHeight = isInitialDimensionPass ? documentScrollHeight : contentHeight;
    const iframeWidth = isInitialDimensionPass ? documentScrollWidth : contentWidth;

    if (!iframeHeight || !iframeWidth) {
      runAsap(informAboutScroll);
      return;
    }
    const isThereAChangeInDimensions = knownIframeHeight !== iframeHeight || knownIframeWidth !== iframeWidth;
    if (isThereAChangeInDimensions || !embedStore.providedCorrectHeightToParent) {
      knownIframeHeight = iframeHeight;
      knownIframeWidth = iframeWidth;

      // FIXME: This event shouldn't be subscribable by the user. Only by the SDK.
      sdkActionManager?.fire("__dimensionChanged", {
        iframeHeight,
        iframeWidth,
        isFirstTime: isInitialDimensionPass,
      });
    }

    // After the initial pass, we've provided the correct height to parent
    // This happens on second pass regardless of whether dimensions changed
    if (!isInitialDimensionPass) {
      embedStore.providedCorrectHeightToParent = true;
    }

    isInitialDimensionPass = false;
    // Parent Counterpart would change the dimension of iframe and thus page's dimension would be impacted which is recursive.
    // It should stop ideally by reaching a hiddenHeight value of 0.
    // FIXME: If 0 can't be reached we need to just abandon our quest for perfect iframe and let scroll be there. Such case can be logged in the wild and fixed later on.
    runAsap(informAboutScroll);
  });
}

/**
 * Moves the queuedFormResponse to the routingFormResponse record to mark it as an actual response now.
 */
export const recordResponseIfQueued = async (params: Record<string, string | string[]>) => {
  const url = new URL(document.URL);
  let routingFormResponseId: number | null = null;
  const queuedFormResponseIdParam = url.searchParams.get("cal.queuedFormResponseId");
  const queuedFormResponseId = queuedFormResponseIdParam;
  if (!queuedFormResponseId) {
    return null;
  }
  // Corresponding dry run value for routingFormResponseId is 0
  if (queuedFormResponseId === "00000000-0000-0000-0000-000000000000") {
    return 0;
  }
  // form is formId and isn't acutal Form data
  const { form: _1, ...actualFormData } = params;
  const res = await fetch(`/api/routing-forms/queued-response`, {
    method: "POST",
    body: JSON.stringify({ queuedFormResponseId, params: actualFormData }),
  });
  if (!res.ok) {
    return null;
  }
  const response = await res.json();
  const formResponseId = response.data.formResponseId;
  if (formResponseId) {
    // Now we have the actual routingFormResponseId.
    routingFormResponseId = formResponseId;
  }
  return routingFormResponseId;
};
