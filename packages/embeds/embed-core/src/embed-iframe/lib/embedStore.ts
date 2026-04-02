import { isParamValuePresentInUrlSearchParams } from "../../lib/utils";
import type {
  EmbedNonStylesConfig,
  EmbedStyles,
  EmbedThemeConfig,
  SetStyles,
  setNonStylesConfig,
  UiConfig,
} from "../../types";
import { log, runAsap } from "./utils";

export enum EMBED_IFRAME_STATE {
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
  /**
   * Unique identifier for the current link view. Incremented on each `linkReady` event (non-prerendering).
   * - null = not yet initialized (before first linkReady)
   * - 1 = first view (triggers bookerViewed)
   * - 2+ = subsequent views/reopens (triggers bookerReopened)
   *
   * `linkReady` fires when iframe content is fully ready for user interaction
   * (after content height is known and slots are loaded if skeleton loader is used).
   */
  viewId: null as number | null,
  /**
   * Page-specific state that gets reset when a new page/view loads.
   * All state that should be cleared between page views should be stored here.
   */
  pageData: {
    /**
     * State for tracking embed events (bookerViewed, bookerReady, etc.)
     */
    eventsState: {
      /**
       * Tracks whether bookerViewed event has been fired for the current view.
       * Reset to false when linkReady fires (via resetPageData).
       */
      bookerViewed: {
        hasFired: false,
      },
      /**
       * Tracks whether bookerReopened event has been fired for the current view.
       * Reset to false when linkReady fires (via resetPageData).
       */
      bookerReopened: {
        hasFired: false,
      },
      /**
       * Tracks whether bookerReloaded event has been fired for the current view.
       * Reset to false when linkReady fires (via resetPageData).
       */
      bookerReloaded: {
        hasFired: false,
      },
      /**
       * Tracks whether bookerReady event has been fired for the current view.
       * Reset to false when linkReady fires (via resetPageData).
       */
      bookerReady: {
        hasFired: false,
      },
    },
    /**
     * Flag to indicate that a reload was initiated and bookerReloaded should fire on next linkReady.
     * Set to true when __reloadInitiated is received.
     * Reset after firing bookerReloaded on linkReady.
     */
    reloadInitiated: false,
  },
};

/**
 * Resets all page-specific data
 */
export function resetPageData() {
  log("Resetting page data");
  embedStore.pageData = {
    eventsState: {
      bookerViewed: {
        hasFired: false,
      },
      bookerReopened: {
        hasFired: false,
      },
      bookerReloaded: {
        hasFired: false,
      },
      bookerReady: {
        hasFired: false,
      },
    },
    reloadInitiated: false,
  };
}

/**
 * Type for direct properties of pageData (excluding nested objects like eventsState)
 */
type PageDataDirectProps = Omit<typeof embedStore.pageData, "eventsState">;

/**
 * Gets a direct property from pageData in a type-safe way
 */
export function getPageDataProp<K extends keyof PageDataDirectProps>(key: K): PageDataDirectProps[K] {
  return embedStore.pageData[key] as PageDataDirectProps[K];
}

/**
 * Sets a direct property on pageData in a type-safe way
 */
export function setPageDataProp<K extends keyof PageDataDirectProps>(
  key: K,
  value: PageDataDirectProps[K]
): void {
  embedStore.pageData[key] = value;
}

/**
 * Event names that have a hasFired state
 */
type EventNameWithHasFiredState = "bookerViewed" | "bookerReopened" | "bookerReloaded" | "bookerReady";

/**
 * Gets whether a particular event has fired
 */
export function getEventHasFired(eventName: EventNameWithHasFiredState): boolean {
  return embedStore.pageData.eventsState[eventName].hasFired;
}

/**
 * Sets whether a particular event has fired
 */
export function setEventHasFired(eventName: EventNameWithHasFiredState, value: boolean): void {
  embedStore.pageData.eventsState[eventName].hasFired = value;
}

/**
 * Gets whether reload was initiated
 */
export function getReloadInitiated(): boolean {
  return getPageDataProp("reloadInitiated");
}

/**
 * Sets whether reload was initiated
 */
export function setReloadInitiated(value: boolean): void {
  setPageDataProp("reloadInitiated", value);
}

/**
 * Increments the viewId counter (1 = first view, 2+ = reopens).
 */
export function incrementView(): void {
  if (!embedStore.viewId) {
    embedStore.viewId = 1;
  } else {
    embedStore.viewId++;
  }
}

export type EmbedStore = typeof embedStore;
