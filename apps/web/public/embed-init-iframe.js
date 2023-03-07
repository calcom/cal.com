const calEmbedMode = typeof new URL(document.URL).searchParams.get("embed") === "string";
/* Iframe Name */
window.name.includes("cal-embed");

window.isEmbed = () => {
  // Once an embed mode always an embed mode
  return calEmbedMode;
};

window.resetEmbedStatus = () => {
  try {
    // eslint-disable-next-line @calcom/eslint/avoid-web-storage
    window.sessionStorage.removeItem("calEmbedMode");
  } catch (e) {}
};

window.getEmbedTheme = () => {
  const url = new URL(document.URL);
  return url.searchParams.get("theme");
};

window.getEmbedNamespace = () => {
  const url = new URL(document.URL);
  const namespace = url.searchParams.get("embed");
  return namespace;
};
