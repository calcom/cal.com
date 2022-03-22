import { sdkEventManager } from "@lib/sdk-event";

if (typeof window !== "undefined") {
  sdkEventManager?.on("*", (e) => {
    const detail = e.detail;
    //console.log(detail.fullType, detail.type, detail.data);
    parent.postMessage(detail, "*");
  });

  (function keepParentInformedAboutDimensionChanges() {
    let knownHiddenHeight: Number | null = null;
    let numDimensionChanges = 0;
    requestAnimationFrame(function informAboutScroll() {
      // Because of scroll="no", this much is hidden from the user.
      const hiddenHeight = document.documentElement.scrollHeight - window.innerHeight;
      // TODO: Handle height as well.
      if (knownHiddenHeight !== hiddenHeight) {
        knownHiddenHeight = hiddenHeight;
        numDimensionChanges++;
        sdkEventManager?.fire("dimension-changed", {
          hiddenHeight,
        });
      }
      // Parent Counterpart would change the dimension of iframe and thus page's dimension would be impacted which is recursive.
      // It should stop ideally by reaching a hiddenHeight value of 0.
      // FIXME: If 0 can't be reached we need to just abandon our quest for perfect iframe and let scroll be there. Such case can be logged in the wild and fixed later on.
      if (numDimensionChanges > 50) {
        console.warn("Too many dimension changes detected.");
        return;
      }
      requestAnimationFrame(informAboutScroll);
    });
  })();
}
