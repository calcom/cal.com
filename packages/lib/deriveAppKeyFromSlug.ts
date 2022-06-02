export function deriveAppKeyFromType(appType, map) {
  const oldTypes = ["video", "other", "calendar", "web3", "payment", "messaging"];

  // slack has a bug where in config slack_app is the type(to match Credential.type) but directory is `slackmessaging`
  // We can't derive slackmessaging from slack_app without hardcoding it.
  if (appType === "slack_app") {
    return "slackmessaging";
  }
  let handlers = map[appType];

  if (handlers) {
    return appType;
  }

  // There can be two types of legacy types
  // - zoom_video
  // - zoomvideo
  // Transform `zoom_video` to `zoomvideo`;
  appType = appType.split("_").join("");
  handlers = map[appType];

  if (handlers) {
    return appType;
  }

  // Instead of doing a blind split at _ and using the first part, apply this hack only on strings that match legacy type.
  // Transform zoomvideo to zoom
  oldTypes.some((type) => {
    const matcher = new RegExp(`(.+)${type}$`);
    if (appType.match(matcher)) {
      appType = appType.replace(matcher, "$1");
      return true;
    }
  });
  return appType;
}
