export function deriveAppKeyFromSlug(legacySlug, map) {
  const oldTypes = ["video", "other", "calendar", "web3", "payment", "messaging"];
  const handlerKey = legacySlug as keyof typeof map;
  const handlers = map[handlerKey];
  if (handlers) {
    return handlerKey;
  }
  // There can be two types of legacy slug
  // - zoom_video
  // - zoomvideo
  // Transform `zoom_video` to `zoomvideo`;
  let slug = legacySlug.split("_").join("");

  // Transform zoomvideo to zoom
  oldTypes.some((type) => {
    const matcher = new RegExp(`(.+)${type}$`);
    if (legacySlug.match(matcher)) {
      slug = legacySlug.replace(matcher, "$1");
      return true;
    }
  });
  return slug;
}
