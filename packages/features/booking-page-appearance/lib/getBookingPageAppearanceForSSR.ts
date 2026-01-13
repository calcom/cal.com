import type { PrismaClient } from "@calcom/prisma";
import type { BookingPageAppearance } from "@calcom/prisma/zod-utils";

import { buildAppearanceCssVars, buildGoogleFontsUrl, cssVarsToStyleString } from "./buildAppearanceCssVars";
import { BookingPageAppearanceRepository } from "../repositories/BookingPageAppearanceRepository";

export type BookingPageAppearanceSSRData = {
  appearance: BookingPageAppearance | null;
  cssString: string;
  googleFontsUrl: string | null;
};

/**
 * Gets the booking page appearance data for SSR injection.
 * This function fetches the effective appearance for a user (considering org cascade priority)
 * and returns the CSS string and Google Fonts URL for injection into the HTML.
 */
export async function getBookingPageAppearanceForUser(
  prisma: PrismaClient,
  userId: number
): Promise<BookingPageAppearanceSSRData> {
  const repository = new BookingPageAppearanceRepository(prisma);
  const appearance = await repository.findEffectiveByUserId(userId);

  if (!appearance) {
    return {
      appearance: null,
      cssString: "",
      googleFontsUrl: null,
    };
  }

  const cssVars = buildAppearanceCssVars(appearance);
  const cssString = cssVarsToStyleString(cssVars);
  const googleFontsUrl = buildGoogleFontsUrl(appearance);

  return {
    appearance,
    cssString,
    googleFontsUrl,
  };
}

/**
 * Gets the booking page appearance data for SSR injection for team events.
 * This function fetches the effective appearance for a team (considering org cascade priority)
 * and returns the CSS string and Google Fonts URL for injection into the HTML.
 */
export async function getBookingPageAppearanceForTeam(
  prisma: PrismaClient,
  teamId: number
): Promise<BookingPageAppearanceSSRData> {
  const repository = new BookingPageAppearanceRepository(prisma);
  const appearance = await repository.findEffectiveByTeamId(teamId);

  if (!appearance) {
    return {
      appearance: null,
      cssString: "",
      googleFontsUrl: null,
    };
  }

  const cssVars = buildAppearanceCssVars(appearance);
  const cssString = cssVarsToStyleString(cssVars);
  const googleFontsUrl = buildGoogleFontsUrl(appearance);

  return {
    appearance,
    cssString,
    googleFontsUrl,
  };
}
