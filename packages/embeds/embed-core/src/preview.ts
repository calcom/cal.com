const searchParams = new URL(document.URL).searchParams;
const embedType = searchParams.get("embedType");
const calLink = searchParams.get("calLink");
const bookerUrl = searchParams.get("bookerUrl");
const embedLibUrl = searchParams.get("embedLibUrl");
if (!bookerUrl || !embedLibUrl) {
  throw new Error('Can\'t Preview: Missing "bookerUrl" or "embedLibUrl" query parameter');
}
// Install Cal Embed Code Snippet
(function (C, A, L) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = function (a: any, ar: any) {
    a.q.push(ar);
  };
  const d = C.document;
  C.Cal =
    C.Cal ||
    function () {
      const cal = C.Cal;
      // eslint-disable-next-line prefer-rest-params
      const ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: { (): void; q?: any[] } = function () {
          // eslint-disable-next-line prefer-rest-params
          p(api, arguments);
        };
        const namespace = ar[1];
        api.q = api.q || [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
        return;
      }
      p(cal, ar);
    };
})(window, embedLibUrl, "init");

const previewWindow = window;
previewWindow.Cal.fingerprint = import.meta.env.EMBED_PUBLIC_EMBED_FINGER_PRINT as string;

previewWindow.Cal("init", {
  origin: bookerUrl,
});

if (!calLink) {
  throw new Error('Missing "calLink" query parameter');
}
if (embedType === "inline") {
  previewWindow.Cal("inline", {
    elementOrSelector: "#my-embed",
    calLink: calLink,
  });
} else if (embedType === "floating-popup") {
  previewWindow.Cal("floatingButton", {
    calLink: calLink,
    attributes: {
      id: "my-floating-button",
    },
  });
} else if (embedType === "element-click") {
  const button = document.createElement("button");
  button.setAttribute("data-cal-link", calLink);
  button.innerHTML = "I am a button that exists on your website";
  document.body.appendChild(button);
}

previewWindow.addEventListener("message", (e) => {
  const data = e.data;
  if (data.mode !== "cal:preview") {
    return;
  }

  const globalCal = window.Cal;
  if (!globalCal) {
    throw new Error("Cal is not defined yet");
  }
  if (data.type == "instruction") {
    globalCal(data.instruction.name, data.instruction.arg);
  }
  if (data.type == "inlineEmbedDimensionUpdate") {
    const inlineEl = document.querySelector<HTMLElement>("#my-embed");
    if (inlineEl) {
      inlineEl.style.width = data.data.width;
      inlineEl.style.height = data.data.height;
    }
  }
});

function makePreviewPageUseSystemPreference() {
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function handleColorSchemeChange(e: MediaQueryListEvent) {
    if (e.matches) {
      // Dark color scheme
      document.body.classList.remove("light");
      document.body.classList.add("dark");
    } else {
      // Light color scheme
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    }
  }

  colorSchemeQuery.addEventListener("change", handleColorSchemeChange);

  // Initial check
  handleColorSchemeChange(new MediaQueryListEvent("change", { matches: colorSchemeQuery.matches }));
}

// This makes preview page behave like a website that has system preference enabled. This provides a better experience of preview when user switch their system theme to dark
makePreviewPageUseSystemPreference();

export {};
