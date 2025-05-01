"use client";

import { usePathname } from "next/navigation";

const THEME_UNSUPPORTED_ROUTES = ["/auth/setup"];

export default function useIsThemeSupported(): boolean {
  const pathname = usePathname();

  // Check if current pathname matches any unsupported route
  const isUnsupportedRoute = THEME_UNSUPPORTED_ROUTES.some((route) => pathname?.startsWith(route));

  return !isUnsupportedRoute;
}
