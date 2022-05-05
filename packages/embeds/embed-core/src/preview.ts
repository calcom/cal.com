import { CalWindow } from "@calcom/embed-snippet";

window.addEventListener("message", (e) => {
  const data = e.data;
  if (data.mode !== "cal:preview") {
    return;
  }

  const globalCal = (window as CalWindow).Cal;
  if (!globalCal) {
    throw new Error("Cal is not defined yet");
  }
  if (data.type == "instruction") {
    globalCal(data.instruction.name, data.instruction.arg);
  }
  if (data.type == "inlineEmbedDimensionUpdate") {
    const inlineEl = document.querySelector("#my-embed") as HTMLElement;
    if (inlineEl) {
      inlineEl.style.width = data.data.width;
      inlineEl.style.height = data.data.height;
    }
  }
});
