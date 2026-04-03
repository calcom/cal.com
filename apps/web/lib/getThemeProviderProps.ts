import type { ReadonlyURLSearchParams } from "next/navigation";
import { z } from "zod";

import { EmbedTheme } from "@calcom/features/embed/lib/constants";

const enum ThemeSupport {
  // e.g. Login Page
  None = "none",
  // Entire App except Booking Pages
  App = "appConfigured",
  // Booking Pages(including Routing Forms)
  Booking = "bookingConfigured",
}

/**
 * Returns a unique identifier that remains the same as long as we land on the public page for the same entity like event-type/routing-form/dynamic-group-booking etc
 * The theme stays same for same identifier.
 */
export function getUniqueIdentifierForBookingPage({ pathname }: { pathname: string }) {
  if (pathname === "/") {
    // For Org domains, we could have a booking page at root path too, so we use '/' as identifier
    // As localStorage isn't shared for different org domains, it's safe to use '/' as identifier
    return "/";
  }
  const pathTokens = pathname.split("/").slice(1);

  // If it is a booking page then it could be one of the following:
  // User booking page e.g. /free and /free/30mins
  // Team booking page e.g. /team/sales and /team/sales/30mins
  // Organization Team booking page e.g. /sales and /sales/30mins - Same pattern as User Booking Page
  const startsWithTeam = pathTokens[0] === "team";
  const isRoutingFormPage = pathTokens[0] === "forms";
  const isPrivateBookingPage = pathTokens[0] === "d";
  const isDynamicBookingPage = pathTokens[0].toLowerCase().split(/\+|%2B/).length > 1;
  if (isRoutingFormPage) {
    return pathTokens[1];
  }
  if (isPrivateBookingPage) {
    return pathTokens[1];
  }
  if (isDynamicBookingPage) {
    return pathTokens[0];
  }

  if (startsWithTeam) {
    // Note: Different organizations can have same team slugs but those are on different subdomains and thus it isn't a problem to have same themeBasis because storage is different for different origins
    return pathTokens[1];
  }

  return pathTokens[0];
}

/**
 * The most important job for this fn is to generate correct storageKey for theme persistenc.
 * `storageKey` is important because that key is listened for changes(using [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event) and any pages opened will change it's theme based on that(as part of next-themes implementation).
 * Choosing the right storageKey avoids theme flickering caused by another page using different theme
 * So, we handle all the cases here namely,
 * - Both Booking Pages, /free/30min and /pro/30min but configured with different themes but being operated together.
 * - Embeds using different namespace. They can be completely themed different on the same page.
 * - Embeds using the same namespace but showing different cal.com links with different themes
 * - Embeds using the same namespace and showing same cal.com links with different themes(Different theme is possible for same cal.com link in case of embed because of theme config available in embed)
 * - App has different theme then Booking Pages.
 *
 * All the above cases have one thing in common, which is the origin and thus localStorage is shared and thus `storageKey` is critical to avoid theme flickering.
 *
 * Some things to note:
 * - There is a side effect of so many factors in `storageKey` that many localStorage keys will be created if a user goes through all these scenarios(e.g like booking a lot of different users)
 * - Some might recommend disabling localStorage persistence but that doesn't give good UX as then we would default to light theme always for a few seconds before switching to dark theme(if that's the user's preference).
 * - We can't disable [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event handling as well because changing theme in one tab won't change the theme without refresh in other tabs. That's again a bad UX
 * - Theme flickering becomes infinitely ongoing in case of embeds because of the browser's delay in processing `storage` event within iframes. Consider two embeds simultaneously opened with pages A and B. Note the timeline and keep in mind that it happened
 *  because 'setItem(A)' and 'Receives storageEvent(A)' allowed executing setItem(B) in b/w because of the delay.
 *    - t1 -> setItem(A) & Fires storageEvent(A) - On Page A) - Current State(A)
 *    - t2 -> setItem(B) & Fires storageEvent(B) - On Page B) - Current State(B)
 *    - t3 -> Receives storageEvent(A) & thus setItem(A) & thus fires storageEvent(A) (On Page B) - Current State(A)
 *    - t4 -> Receives storageEvent(B) & thus setItem(B) & thus fires storageEvent(B) (On Page A) - Current State(B)
 *    - ... and so on ...
 */
export function getThemeProviderProps({
  props,
  isEmbedMode,
  embedNamespace,
  pathname,
  searchParams,
}: {
  props: {
    isBookingPage: boolean;
    nonce: string | undefined;
    isThemeSupported?: boolean | undefined;
  };
  isEmbedMode: boolean;
  embedNamespace: string | null;
  pathname: string | null;
  searchParams: ReadonlyURLSearchParams | null;
}) {
  const isBookingPage = props.isBookingPage;
  const themeSupport = isBookingPage
    ? ThemeSupport.Booking
    : props.isThemeSupported === false
      ? ThemeSupport.None
      : ThemeSupport.App;

  const themeQueryParam = searchParams?.get("theme") ?? "";
  const themeParsed = z.enum(["light", "dark", "system", "auto"]).safeParse(themeQueryParam);
  const isWrongThemeValue = themeQueryParam.length > 0 && !themeParsed.success;
  const forcedTheme = themeSupport === ThemeSupport.None || isWrongThemeValue ? "light" : undefined;
  if (forcedTheme) {
    return {
      key: "forcedThemeKey",
      storageKey: "forcedThemeKey",
      forcedTheme,
      attribute: "class",
      nonce: props.nonce,
      enableColorScheme: false,
      enableSystem: themeSupport !== ThemeSupport.None,
    };
  }

  const isBookingPageThemeSupportRequired = themeSupport === ThemeSupport.Booking;
  const themeBasis = pathname ? getUniqueIdentifierForBookingPage({ pathname }) : null;
  const isThemeBasisRequired = isBookingPageThemeSupportRequired || isEmbedMode;
  if (isThemeBasisRequired && !themeBasis) {
    console.error("`themeBasis` is nullish. This should not happen.", {
      pathname,
    });
  }

  const appearanceIdSuffix = themeBasis ? `:${themeBasis}` : "";
  const embedExplicitlySetThemeSuffix =
    isEmbedMode && themeQueryParam && themeQueryParam !== EmbedTheme.auto ? `:${themeQueryParam}` : "";

  const storageKey = isEmbedMode
    ? // Same Namespace, Same Organizer but different themes would still work seamless and not cause theme flicker
      // Even though it's recommended to use different namespaces when you want to theme differently on the same page but if the embeds are on different pages, the problem can still arise
      `embed-theme-${embedNamespace}${appearanceIdSuffix}${embedExplicitlySetThemeSuffix}`
    : themeSupport === ThemeSupport.App
      ? "app-theme"
      : isBookingPageThemeSupportRequired
        ? `booking-theme${appearanceIdSuffix}`
        : undefined;

  const themeProviderProps = {
    storageKey,
    nonce: props.nonce,
    enableColorScheme: false,
    // Enables theme switching based on system preference if true
    enableSystem: themeSupport !== ThemeSupport.None,
    // next-themes doesn't listen to changes on storageKey. So we need to force a re-render when storageKey changes
    // This is how login to dashboard soft navigation changes theme from light to dark
    key: storageKey,
    attribute: "class",
  };

  return themeProviderProps;
}
