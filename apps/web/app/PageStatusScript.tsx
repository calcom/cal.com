"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export function PageStatusScript() {
  const pathname = usePathname();
  let pageStatus = "200";

  if (pathname === "/404") {
    pageStatus = "404";
  } else if (pathname === "/500") {
    pageStatus = "500";
  } else if (pathname === "/403") {
    pageStatus = "403";
  }

  return (
    <Script
      id="page-status"
      dangerouslySetInnerHTML={{ __html: `window.CalComPageStatus = '${pageStatus}'` }}
    />
  );
}
