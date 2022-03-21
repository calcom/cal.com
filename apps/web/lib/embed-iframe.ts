import { addEventListener } from "@lib/sdk-event";

if (typeof window !== "undefined") {
  addEventListener("*", (e) => {
    const detail = e.detail;
    //console.log(detail.fullType, detail.type, detail.data);
    parent.postMessage(detail, "*");
  });
}
