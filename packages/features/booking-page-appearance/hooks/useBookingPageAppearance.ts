"use client";

import { useEffect } from "react";

import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";

import { buildAppearanceCssVars, buildGoogleFontsUrl, cssVarsToStyleString } from "../lib/buildAppearanceCssVars";

const STYLE_ELEMENT_ID = "cal-booking-page-appearance";
const FONT_LINK_ELEMENT_ID = "cal-booking-page-fonts";

/**
 * Hook that applies booking page appearance styles to the document.
 * This injects CSS custom properties into the document head.
 */
export function useBookingPageAppearance(appearance: BookingPageAppearance | null | undefined) {
  useEffect(() => {
    if (!appearance) {
      removeAppearanceStyles();
      return;
    }

    const cssVars = buildAppearanceCssVars(appearance);
    const styleString = cssVarsToStyleString(cssVars);

    if (styleString) {
      injectAppearanceStyles(styleString);
    } else {
      removeAppearanceStyles();
    }

    const fontsUrl = buildGoogleFontsUrl(appearance);
    if (fontsUrl) {
      injectFontLink(fontsUrl);
    } else {
      removeFontLink();
    }

    return () => {
      removeAppearanceStyles();
      removeFontLink();
    };
  }, [appearance]);
}

function injectAppearanceStyles(styleString: string) {
  let styleElement = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = styleString;
}

function removeAppearanceStyles() {
  const styleElement = document.getElementById(STYLE_ELEMENT_ID);
  if (styleElement) {
    styleElement.remove();
  }
}

function injectFontLink(fontsUrl: string) {
  let linkElement = document.getElementById(FONT_LINK_ELEMENT_ID) as HTMLLinkElement | null;

  if (!linkElement) {
    linkElement = document.createElement("link");
    linkElement.id = FONT_LINK_ELEMENT_ID;
    linkElement.rel = "stylesheet";
    document.head.appendChild(linkElement);
  }

  if (linkElement.href !== fontsUrl) {
    linkElement.href = fontsUrl;
  }
}

function removeFontLink() {
  const linkElement = document.getElementById(FONT_LINK_ELEMENT_ID);
  if (linkElement) {
    linkElement.remove();
  }
}
