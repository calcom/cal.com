(function () {
  const n = document.createElement("link").relList;
  if (n && n.supports && n.supports("modulepreload")) return;
  for (const t of document.querySelectorAll('link[rel="modulepreload"]')) i(t);
  new MutationObserver((t) => {
    for (const e of t)
      if (e.type === "childList")
        for (const o of e.addedNodes) o.tagName === "LINK" && o.rel === "modulepreload" && i(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function s(t) {
    const e = {};
    return (
      t.integrity && (e.integrity = t.integrity),
      t.referrerPolicy && (e.referrerPolicy = t.referrerPolicy),
      t.crossOrigin === "use-credentials"
        ? (e.credentials = "include")
        : t.crossOrigin === "anonymous"
        ? (e.credentials = "omit")
        : (e.credentials = "same-origin"),
      e
    );
  }
  function i(t) {
    if (t.ep) return;
    t.ep = !0;
    const e = s(t);
    fetch(t.href, e);
  }
})();
const u = new URL(document.URL).searchParams,
  m = u.get("embedType"),
  l = u.get("calLink"),
  f = u.get("bookerUrl"),
  p = u.get("embedLibUrl");
if (!f || !p) throw new Error(`Can't Preview: Missing "bookerUrl" or "embedLibUrl" query parameter`);
(function (r, n, s) {
  const i = function (e, o) {
      e.q.push(o);
    },
    t = r.document;
  r.Cal =
    r.Cal ||
    function () {
      const e = r.Cal,
        o = arguments;
      if (
        (e.loaded ||
          ((e.ns = {}),
          (e.q = e.q || []),
          (t.head.appendChild(t.createElement("script")).src = n),
          (e.loaded = !0)),
        o[0] === s)
      ) {
        const d = function () {
            i(d, arguments);
          },
          a = o[1];
        (d.q = d.q || []),
          typeof a == "string"
            ? ((e.ns[a] = e.ns[a] || d), i(e.ns[a], o), i(e, ["initNamespace", a]))
            : i(e, o);
        return;
      }
      i(e, o);
    };
})(window, p, "init");
const c = window;
c.Cal.fingerprint = "0b719ac";
c.Cal("init", { origin: f });
if (!l) throw new Error('Missing "calLink" query parameter');
if (m === "inline") c.Cal("inline", { elementOrSelector: "#my-embed", calLink: l });
else if (m === "floating-popup")
  c.Cal("floatingButton", { calLink: l, attributes: { id: "my-floating-button" } });
else if (m === "element-click") {
  const r = document.createElement("button");
  r.setAttribute("data-cal-link", l),
    (r.innerHTML = "I am a button that exists on your website"),
    document.body.appendChild(r);
}
c.addEventListener("message", (r) => {
  const n = r.data;
  if (n.mode !== "cal:preview") return;
  const s = window.Cal;
  if (!s) throw new Error("Cal is not defined yet");
  if (
    (n.type == "instruction" && s(n.instruction.name, n.instruction.arg),
    n.type == "inlineEmbedDimensionUpdate")
  ) {
    const i = document.querySelector("#my-embed");
    i && ((i.style.width = n.data.width), (i.style.height = n.data.height));
  }
});
function h() {
  const r = window.matchMedia("(prefers-color-scheme: dark)");
  function n(s) {
    s.matches
      ? (document.body.classList.remove("light"), document.body.classList.add("dark"))
      : (document.body.classList.add("light"), document.body.classList.remove("dark"));
  }
  r.addEventListener("change", n), n(new MediaQueryListEvent("change", { matches: r.matches }));
}
h();
