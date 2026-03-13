import type {
  ThemeOption,
  UiOptions,
  StylesMap,
  NonStyleConfig,
  StyleSetter,
  NonStyleSetter,
} from "../types/shared";

export const enum StorePhase {
  PENDING,
  READY,
}

type ParamSet = Record<string, string | string[]>;

function buildParamManager() {
  return {
    ensureParams({
      requiredParams,
      forbiddenParams,
    }: {
      requiredParams: ParamSet;
      forbiddenParams: string[];
    }): { changed: boolean; stop: () => void } {
      let alive = true;

      function tick(): { changed: boolean } {
        if (!alive) return { changed: false };
        const url = new URL(document.URL);
        let dirty = false;

        for (const [k, v] of Object.entries(requiredParams)) {
          const values = Array.isArray(v) ? v : [v];
          const existing = url.searchParams.getAll(k);
          const matches = existing.length === values.length && values.every((val) => existing.includes(val));
          if (!matches) {
            dirty = true;
            url.searchParams.delete(k);
            values.forEach((val) => url.searchParams.append(k, val));
          }
        }

        forbiddenParams.forEach((k) => url.searchParams.delete(k));
        const changed = dirty || forbiddenParams.length > 0;
        if (changed) window.history.replaceState({}, "", url.toString());

        setTimeout(tick, 50);
        return { changed };
      }

      const { changed } = tick();
      return {
        stop: () => {
          alive = false;
        },
        changed,
      };
    },
  };
}

export const iframeState = {
  connectVersion: 0 as number,
  renderState: null as null | "inProgress" | "completed",
  paramManager: buildParamManager(),
  phase: StorePhase.PENDING,
  styleMap: {} as StylesMap | undefined,
  nonStyleMap: {} as NonStyleConfig | undefined,
  ns: null as string | null,
  embedKind: undefined as undefined | null | string,
  styleSetters: {} as Record<keyof StylesMap, StyleSetter>,
  nonStyleSetters: {} as Record<keyof NonStyleConfig, NonStyleSetter>,
  parentNotified: false,
  windowLoaded: false,
  applyTheme: undefined as ((t: ThemeOption) => void) | undefined,
  activeTheme: undefined as UiOptions["theme"],
  theme: undefined as UiOptions["theme"],
  uiState: undefined as Omit<UiOptions, "styles" | "theme"> | undefined,
  uiSetters: [] as ((u: UiOptions) => void)[],
};

export { iframeState as frameStore };
