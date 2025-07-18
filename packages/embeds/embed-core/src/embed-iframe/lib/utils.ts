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
export function isLinkReady({ embedStore }: { embedStore: typeof import("./embedStore").embedStore }) {
  if (!embedStore.parentInformedAboutContentHeight) {
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
