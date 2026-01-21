// We can't import @calcom/lib/constants here yet as this file is compiled using Vite
import process from "node:process";
const WEBAPP_URL = process.env.EMBED_PUBLIC_WEBAPP_URL || "";
if (!WEBAPP_URL) {
  throw new Error("WEBAPP_URL is not set");
}
const EMBED_LIB_URL = process.env.EMBED_PUBLIC_EMBED_LIB_URL || WEBAPP_URL;
const IS_E2E = process.env.NEXT_PUBLIC_IS_E2E === "1";

// Because it is only used in Embed Snippet Generator preview that is accessible through dashboard only which has URL WEBAPP_URL, we are good with this strict restriction
if (!IS_E2E && (window.self === window.top || !document.referrer.startsWith(WEBAPP_URL))) {
  throw new Error(`This page can only be accessed within an iframe from ${WEBAPP_URL}`);
}

// It is a copy of isSafeUrlToLoadResourceFrom in packages/lib/getSafeRedirectUrl. Keep it in sync
// We can't import that here has it is loaded in a separate Vanilla JS page
function isSafeUrlToLoadResourceFrom(urlString: string) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    // Allow localhost for development
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }

    const webappUrl = new URL(WEBAPP_URL);
    const embedLibUrl = new URL(EMBED_LIB_URL);

    const urlTldPlus1 = getTldPlus1(url.hostname);
    const webappTldPlus1 = getTldPlus1(webappUrl.hostname);
    const embedLibTldPlus1 = getTldPlus1(embedLibUrl.hostname);

    // URLs must share the same TLD+1
    return [webappTldPlus1, embedLibTldPlus1].includes(urlTldPlus1);
  } catch {
    return false;
  }

  function getTldPlus1(hostname: string) {
    // Note: It doesn't support multipart tlds like .co.uk and thus makes only one part tld's safe like .com(and thus cal.com)
    // If we want to use it elsewhere as well(apart from embed/preview.ts) we must consider Public Suffix List
    return hostname.split(".").slice(-2).join(".");
  }
}

const searchParams = new URL(document.URL).searchParams;
const embedType = searchParams.get("embedType");
const calLink = searchParams.get("calLink");
const bookerUrl = searchParams.get("bookerUrl");
const embedLibUrl = searchParams.get("embedLibUrl");

if (!bookerUrl || !embedLibUrl) {
  throw new Error('Can\'t Preview: Missing "bookerUrl" or "embedLibUrl" query parameter');
}

if (!isSafeUrlToLoadResourceFrom(embedLibUrl)) {
  throw new Error('Invalid "embedLibUrl".');
}

if (!isSafeUrlToLoadResourceFrom(bookerUrl)) {
  throw new Error('Invalid "bookerUrl".');
}

if (!calLink) {
  throw new Error('Missing "calLink" query parameter');
}

// TODO: Reuse the embed code snippet from the embed-snippet package - Not able to use it because of circular dependency
// Install Cal Embed Code Snippet
((C, A, L) => {
  // @ts-expect-error
  const p = (a, ar) => {
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
        const api = function () {
          // eslint-disable-next-line prefer-rest-params
          p(api, arguments);
        };
        const namespace = ar[1];
        // @ts-expect-error
        api.q = api.q || [];
        if (typeof namespace === "string") {
          // Make sure that even after re-execution of the snippet, the namespace is not overridden
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ["initNamespace", namespace]);
        } else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
})(window, embedLibUrl, "init");
const previewWindow = window;
previewWindow.Cal.fingerprint = process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT as string;
previewWindow.Cal.version = process.env.EMBED_PUBLIC_EMBED_VERSION as string;

previewWindow.Cal("init", {
  origin: bookerUrl,
});

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
