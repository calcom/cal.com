const APP_URL = process.env.EMBED_PUBLIC_WEBAPP_URL || "";
if (!APP_URL) throw new Error("WEBAPP_URL is not set");

const LIB_URL = process.env.EMBED_PUBLIC_EMBED_LIB_URL || APP_URL;
const IS_E2E = process.env.NEXT_PUBLIC_IS_E2E === "1";

if (!IS_E2E && (window.self === window.top || !document.referrer.startsWith(APP_URL))) {
  throw new Error(`This page can only be accessed within an iframe from ${APP_URL}`);
}

function extractTld(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}

function isTrusted(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    const trusted = [extractTld(new URL(APP_URL).hostname), extractTld(new URL(LIB_URL).hostname)];
    return trusted.includes(extractTld(host));
  } catch {
    return false;
  }
}

const params = new URL(document.URL).searchParams;
const embedType = params.get("embedType");
const calLink = params.get("calLink");
const bookerUrl = params.get("bookerUrl");
const embedLibUrl = params.get("embedLibUrl");

if (!bookerUrl || !embedLibUrl) throw new Error('Missing "bookerUrl" or "embedLibUrl"');
if (!isTrusted(embedLibUrl)) throw new Error('Invalid "embedLibUrl"');
if (!isTrusted(bookerUrl)) throw new Error('Invalid "bookerUrl"');
if (!calLink) throw new Error('Missing "calLink"');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(function (C: any, A: string, L: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enqueue = (a: any, ar: any) => a.q.push(ar);
  const d = C.document;
  C.Cal =
    C.Cal ||
    function (this: unknown) {
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
        const api: any = function () {
          // eslint-disable-next-line prefer-rest-params
          enqueue(api, arguments);
        };
        const ns = ar[1];
        api.q = api.q || [];
        if (typeof ns === "string") {
          cal.ns[ns] = cal.ns[ns] || api;
          enqueue(cal.ns[ns], ar);
          enqueue(cal, ["initNamespace", ns]);
        } else {
          enqueue(cal, ar);
        }
        return;
      }
      enqueue(cal, ar);
    };
})(window, embedLibUrl, "init");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pw = window as any;
pw.Cal.fingerprint = process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT;
pw.Cal.version = process.env.EMBED_PUBLIC_EMBED_VERSION;
pw.Cal("init", { origin: bookerUrl });

if (embedType === "inline") {
  pw.Cal("inline", { elementOrSelector: "#my-embed", calLink });
} else if (embedType === "floating-popup") {
  pw.Cal("floatingButton", { calLink, attributes: { id: "my-floating-button" } });
} else if (embedType === "element-click") {
  const btn = document.createElement("button");
  btn.setAttribute("data-cal-link", calLink);
  btn.innerHTML = "I am a button that exists on your website";
  document.body.appendChild(btn);
}

window.addEventListener("message", (e) => {
  const { data } = e;
  if (data.mode !== "cal:preview") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cal = (window as any).Cal;
  if (!cal) throw new Error("Cal not defined");

  if (data.type === "instruction") cal(data.instruction.name, data.instruction.arg);
  if (data.type === "inlineEmbedDimensionUpdate") {
    const el = document.querySelector<HTMLElement>("#my-embed");
    if (el) {
      el.style.width = data.data.width;
      el.style.height = data.data.height;
    }
  }
});

function watchColorScheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = (e: MediaQueryListEvent) => {
    document.body.classList.toggle("dark", e.matches);
    document.body.classList.toggle("light", !e.matches);
  };
  mq.addEventListener("change", apply);
  apply(new MediaQueryListEvent("change", { matches: mq.matches }));
}

watchColorScheme();
export {};
