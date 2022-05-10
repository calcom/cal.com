import { CalWindow } from "@calcom/embed-snippet";

const WEBAPP_URL =
  import.meta.env.NEXT_PUBLIC_WEBAPP_URL || `https://${import.meta.env.NEXT_PUBLIC_VERCEL_URL}`;
const EMBED_LIB_URL = import.meta.env.NEXT_PUBLIC_EMBED_LIB_URL || `${WEBAPP_URL}/embed/embed.js`;

(window as any).fingerprint = import.meta.env.NEXT_PUBLIC_EMBED_FINGER_PRINT as string;

// Install Cal Embed Code Snippet
(function (C, A, L) {
  // @ts-ignore
  let p = function (a, ar) {
    a.q.push(ar);
  };
  let d = C.document;
  // @ts-ignore
  C.Cal =
    // @ts-ignore
    C.Cal ||
    function () {
      // @ts-ignore
      let cal = C.Cal;
      let ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        // @ts-ignore
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const api = function () {
          p(api, arguments);
        };
        const namespace = ar[1];
        // @ts-ignore
        api.q = api.q || [];
        // @ts-ignore
        typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
        return;
      }
      p(cal, ar);
    };
})(window, EMBED_LIB_URL, "init");

const previewWindow: CalWindow = window;

previewWindow.Cal!("init", {
  origin: WEBAPP_URL,
});
const searchParams = new URL(document.URL).searchParams;
const embedType = searchParams.get("embedType");
const calLink = searchParams.get("calLink");
if (embedType! === "inline") {
  previewWindow.Cal!("inline", {
    elementOrSelector: "#my-embed",
    calLink: calLink,
  });
} else if (embedType === "floating-popup") {
  previewWindow.Cal!("floatingButton", {
    calLink: calLink,
    attributes: {
      id: "my-floating-button",
    },
  });
} else if (embedType === "element-click") {
  const button = document.createElement("button");
  button.setAttribute("data-cal-link", calLink!);
  button.innerHTML = "I am a button that exists on your website";
  document.body.appendChild(button);
}

previewWindow.addEventListener("message", (e) => {
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
