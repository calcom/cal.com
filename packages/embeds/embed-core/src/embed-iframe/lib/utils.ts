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
