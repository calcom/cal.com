import type { EmbedEvent } from "../../sdk-action-manager";

export const getScrollByDistanceHandler =
  (cal: { inlineEl?: Element; scrollByDistance: (distance: number) => void }) =>
  (e: EmbedEvent<"__scrollByDistance">) => {
    if (!cal.inlineEl) {
      // Except inline, others use modalbox which has scroll on iframe itself and thus an attempt to scroll by the child would already be successful
      console.warn("scrollBy event received but ignored as it isn't an inline embed");
      return;
    }
    const distanceRelativeToIframe = e.detail.data.distance;
    // Note: In case of inline embed, Iframe's height is always up-to-date to ensure that there is no vertical scrollbar in the iframe.
    // So, we could just scroll by the distance relative to the iframe and that should bring the content in the iframe into view.
    cal.scrollByDistance(distanceRelativeToIframe);
  };
