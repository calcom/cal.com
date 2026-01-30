// Web-only runtime guards for Companion.
//
// This runs as early as possible on web to prevent a noisy (but harmless)
// react-native-css-interop error when darkMode is set to "media".

declare const window: unknown;
declare const require: undefined | ((id: string) => unknown);

if (typeof window !== "undefined") {
  const w = window as {
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  };

  const shouldSuppressCssInteropError = (err: unknown) => {
    if (!(err instanceof Error)) return false;
    if (!err.message.includes("Cannot manually set color scheme")) return false;

    // Some environments omit stack traces; if we have one, ensure it's the expected source.
    if (typeof err.stack === "string") {
      return err.stack.includes("react-native-css-interop/dist/runtime/web/color-scheme");
    }

    return true;
  };

  const suppressIfMatch = (event: unknown, err: unknown) => {
    if (!event || typeof event !== "object") return;
    const e = event as { preventDefault?: () => void };
    if (shouldSuppressCssInteropError(err)) e.preventDefault?.();
  };

  w.addEventListener?.("error", (event) => {
    const e = event as { error?: unknown };
    suppressIfMatch(event, e.error);
  });

  w.addEventListener?.("unhandledrejection", (event) => {
    const e = event as { reason?: unknown };
    suppressIfMatch(event, e.reason);
  });

  const patchCssInterop = (mod: unknown) => {
    const colorScheme = (mod as { colorScheme?: { set?: (value: unknown) => void } }).colorScheme;
    if (!colorScheme?.set) return;

    // Completely no-op the set call when darkMode is 'media'.
    // Manual color scheme setting is not supported in this mode,
    // so we silently ignore attempts to call it.
    colorScheme.set = () => {
      // No-op: system preference controls the color scheme
    };
  };

  // Patch react-native-css-interop on web to ignore the known error.
  // This can happen very early during init when darkMode is "media", so prefer sync require.
  try {
    if (typeof require === "function") {
      patchCssInterop(require("react-native-css-interop/dist/runtime/web/color-scheme"));
    } else {
      void import("react-native-css-interop/dist/runtime/web/color-scheme")
        .then(patchCssInterop)
        .catch(() => {
          // noop
        });
    }
  } catch {
    // noop
  }
}
