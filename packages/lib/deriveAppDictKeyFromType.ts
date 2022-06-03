export function deriveAppDictKeyFromType(type: string, map: Record<string, unknown>) {
  let handlers = map[type];

  if (handlers) {
    return type;
  }

  // There can be two types of legacy types
  // - zoom_video
  // - zoomvideo
  // Transform `zoom_video` to `zoomvideo`;
  type = type.split("_").join("");
  handlers = map[type];
  if (handlers) {
    return type;
  }

  // zoom_video if it exists as zoom
  // Apps creates through cli would also meet this condition as their type would always be in the format {slug}_{category} and app dir name would be {slug}
  type = type.split("_")[0];
  handlers = map[type];

  if (handlers) {
    return type;
  }

  return type as keyof typeof map;
}
