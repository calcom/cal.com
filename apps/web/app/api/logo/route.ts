import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ANDROID_CHROME_ICON_192,
  ANDROID_CHROME_ICON_256,
  APPLE_TOUCH_ICON,
  FAVICON_16,
  FAVICON_32,
  LOGO,
  LOGO_ICON,
  MSTILE_ICON,
} from "@calcom/lib/constants";

const logoApiSchema = z.object({
  type: z.coerce.string().optional(),
});

type StaticLogoType =
  | "favicon-16"
  | "favicon-32"
  | "apple-touch-icon"
  | "mstile"
  | "android-chrome-192"
  | "android-chrome-256"
  | "icon";

const staticLogoDefinitions: Record<StaticLogoType, string> = {
  "favicon-16": FAVICON_16,
  "favicon-32": FAVICON_32,
  "apple-touch-icon": APPLE_TOUCH_ICON,
  mstile: MSTILE_ICON,
  "android-chrome-192": ANDROID_CHROME_ICON_192,
  "android-chrome-256": ANDROID_CHROME_ICON_256,
  icon: LOGO_ICON,
};

function isValidStaticLogoType(type: string): type is StaticLogoType {
  return type in staticLogoDefinitions;
}

/**
 * This API endpoint serves static logo assets for favicons, app icons, etc.
 * For custom team/organization logos, use /api/customLogo instead.
 */
async function getHandler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = logoApiSchema.parse(Object.fromEntries(searchParams.entries()));

  const type = parsedQuery?.type;

  // If no type specified or it's not a static logo type, serve the default logo
  if (!type || !isValidStaticLogoType(type)) {
    return NextResponse.redirect(new URL(LOGO, request.url));
  }

  const staticAssetPath = staticLogoDefinitions[type];
  return NextResponse.redirect(new URL(staticAssetPath, request.url));
}

export const GET = defaultResponderForAppDir(getHandler);
