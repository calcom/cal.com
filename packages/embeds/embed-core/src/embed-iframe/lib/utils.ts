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
export const convertQueuedFormResponseToRoutingFormResponse = async () => {
  const url = new URL(document.URL);
  let convertedRoutingFormResponseId: string | null = null;
  const queuedFormResponse = url.searchParams.get("cal.queuedFormResponse");
  if (!queuedFormResponse) {
    return null;
  }
  // If queuedFormResponse is true, then cal.routingFormResponseId is the id of the queuedFormResponse
  const queuedFormResponseIdParam = url.searchParams.get("cal.routingFormResponseId");
  const queuedFormResponseId = Number(queuedFormResponseIdParam);
  await fetch(`/api/routing-forms/useQueuedResponse?queuedFormResponseId=${queuedFormResponseId}`).then(
    async (res) => {
      if (res.ok) {
        const response = await res.json();
        if (response.status === "success") {
          const formResponseId = response.data.formResponseId;
          if (formResponseId) {
            // Now we have the actual routingFormResponseId.
            convertedRoutingFormResponseId = formResponseId.toString();
          }
        }
      }
    }
  );
  return convertedRoutingFormResponseId;
};
