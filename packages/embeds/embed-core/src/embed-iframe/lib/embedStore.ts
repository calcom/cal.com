import { isParamValuePresentInUrlSearchParams } from "../../lib/utils";
import type {
  EmbedThemeConfig,
  UiConfig,
  EmbedNonStylesConfig,
  EmbedStyles,
  SetStyles,
  setNonStylesConfig,
} from "../../types";
import { runAsap } from "./utils";

export const enum EMBED_IFRAME_STATE {
  NOT_INITIALIZED,
  INITIALIZED,
}
/**
 * This is in-memory persistence needed so that when user browses through the embed, the configurations from the instructions aren't lost.
 */
export const embedStore = {
  connectVersion: 0 as number,
  /**
   * Tracks whether the iframe is fully rendered or in progress of rendering.
   * In case of prerendering as well as non-prerendering, it would be "completed" after the iframe is fully rendered.
   */
  renderState: null as null | "inProgress" | "completed",

  // Handles the commands of routing received from parent even when React hasn't initialized and nextRouter isn't available
  router: {
    /**
     * When we do the history push, it is possible that
     * - React might revert that change depending on in what state React is in while initializing
     * - So, we use a declarative approach to ensure that our requirement is continuously met
     */
    ensureQueryParamsInUrl({
      toBeThereParams,
      toRemoveParams,
    }: {
      toBeThereParams: Record<string, string | string[]>;
      toRemoveParams: string[];
    }) {
      let stopUpdating = false;
      function updateIfNeeded() {
        if (stopUpdating) {
          return { hasChanged: false };
        }
        const currentUrl = new URL(document.URL);
        let hasChanged = false;

        // Ensuring toBeThereSearchParams
        for (const [key, newValue] of Object.entries(toBeThereParams)) {
          // It checks that the value must be present and if an array no other item should be there except those in newValue
          hasChanged = !isParamValuePresentInUrlSearchParams({
            param: key,
            value: newValue,
            container: currentUrl.searchParams,
          });
          if (hasChanged) {
            setParamInUrl({ key, value: newValue, url: currentUrl });
          }
        }

        removeParamsFromUrl({ keys: toRemoveParams, url: currentUrl });

        hasChanged = hasChanged || toRemoveParams.length > 0;
        if (hasChanged) {
          // Avoid unnecessary history push
          window.history.replaceState({}, "", currentUrl.toString());
        }
        runAsap(updateIfNeeded);
        return {
          hasChanged,
        };
      }
      const { hasChanged } = updateIfNeeded();
      return {
        stopEnsuringQueryParamsInUrl: () => {
          stopUpdating = true;
        },
        hasChanged,
      };

      function removeParamsFromUrl({ keys, url }: { keys: string[]; url: URL }) {
        for (const key of keys) {
          url.searchParams.delete(key);
        }
      }

      function setParamInUrl({ key, value, url }: { key: string; value: string | string[]; url: URL }) {
        // Reset and then set the new value, to ensure nothing else remains in value
        url.searchParams.delete(key);
        const newValueArray = Array.isArray(value) ? value : [value];
        newValueArray.forEach((val) => {
          url.searchParams.append(key, val);
        });
      }
    },
  },

  state: EMBED_IFRAME_STATE.NOT_INITIALIZED,
  // Store all embed styles here so that as and when new elements are mounted, styles can be applied to it.
  styles: {} as EmbedStyles | undefined,
  nonStyles: {} as EmbedNonStylesConfig | undefined,
  namespace: null as string | null,
  embedType: undefined as undefined | null | string,
  // Store all React State setters here.
  reactStylesStateSetters: {} as Record<keyof EmbedStyles, SetStyles>,
  reactNonStylesStateSetters: {} as Record<keyof EmbedNonStylesConfig, setNonStylesConfig>,
  // Embed can show itself only after this is set to true
  providedCorrectHeightToParent: false,
  windowLoadEventFired: false,
  setTheme: undefined as ((arg0: EmbedThemeConfig) => void) | undefined,
  theme: undefined as UiConfig["theme"],
  uiConfig: undefined as Omit<UiConfig, "styles" | "theme"> | undefined,
  /**
   * We maintain a list of all setUiConfig setters that are in use at the moment so that we can update all those components.
   */
  setUiConfig: [] as ((arg0: UiConfig) => void)[],
};

export type EmbedStore = typeof embedStore;
