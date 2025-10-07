"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

// Helper function to determine if scripts should be allowed
function shouldAllowScripts(pathname: string | null): boolean {
  if (!pathname) return false;
  const allowedAnalyticsPaths = [
    "/apps",
    "/auth",
    "/availability",
    "/bookings",
    "/event-types",
    "/getting-started",
    "/settings",
    "/teams",
    "/workflows",
    "/insights",
    "/signup",
    "/auth/sso/google",
    "/auth/verify-email",
  ];

  if (pathname === "" || pathname === "/") return true;
  return allowedAnalyticsPaths.some((path) => pathname.startsWith(path));
}

// Helper function to determine if Meta Pixel should be allowed
function shouldAllowMetaPixel(pathname: string | null): boolean {
  if (!pathname) return false;
  const allowedMetaPixelPaths = [
    "/signup",
    "/auth/sso/google",
    "/auth/verify-email",
    "/getting-started",
    "/event-types",
  ];

  return pathname !== "" && allowedMetaPixelPaths.some((path) => pathname.startsWith(path));
}

interface AnalyticsScriptsProps {
  nonce: string;
}

export function AnalyticsScripts({ nonce }: AnalyticsScriptsProps) {
  const pathname = usePathname();
  console.log("AnalyticsScripts - pathname:", pathname);

  const allowScript = shouldAllowScripts(pathname);
  const allowMetaPixel = shouldAllowMetaPixel(pathname);

  // Track Meta Pixel PageView on pathname change
  useEffect(() => {
    if (allowMetaPixel && typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, allowMetaPixel]);

  return (
    <>
      {/* Google Tag Manager noscript - conditionally loaded */}
      {allowScript && (
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N7JCMTN4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      )}

      {/* Meta Pixel noscript fallback - conditionally loaded */}
      {allowMetaPixel && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1095461542653320&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      )}

      {/* Google Tag Manager - conditionally loaded */}
      {allowScript && (
        <Script
          id="gtm"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),
                dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;
                j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-N7JCMTN4');
            `,
          }}
        />
      )}

      {/* Meta Pixel Code - conditionally loaded */}
      {allowMetaPixel && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1095461542653320');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
