"use client";

import { Button } from "@calid/features/ui/components/button";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { autoOpenInExternalBrowser, isOpenedInWebView, openInExternalBrowser } from "@lib/isWebView";

export default function WebViewBlocker() {
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [needsManualFallback, setNeedsManualFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const appName = (() => {
    if (typeof navigator === "undefined") return "in-app browser";
    const ua = navigator.userAgent;
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB|Messenger/i.test(ua)) return "Facebook";
    if (/LinkedIn/i.test(ua)) return "LinkedIn";
    if (/TikTok/i.test(ua)) return "TikTok";
    if (/Twitter/i.test(ua)) return "X";
    if (/WhatsApp/i.test(ua)) return "WhatsApp";
    if (/Line\//i.test(ua)) return "LINE";
    if (/Snapchat/i.test(ua)) return "Snapchat";
    if (/Reddit/i.test(ua)) return "Reddit";
    return "in-app browser";
  })();

  useEffect(() => {
    if (!isOpenedInWebView()) return;

    const redirected = autoOpenInExternalBrowser();
    if (!redirected) {
      setNeedsManualFallback(true);
      return;
    }

    // Give the browser time to launch; if the page is still visible, show fallback
    const timer = window.setTimeout(() => setNeedsManualFallback(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isIOS]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  if (!needsManualFallback) {
    return (
      <div className="bg-default rounded-md border border-gray-200/80 px-3 py-2 text-left">
        <p className="text-emphasis text-sm font-semibold">Opening your browser…</p>
      </div>
    );
  }

  return (
    <div className="bg-default space-y-3 rounded-md border border-gray-200/80 p-3 text-left">
      <div className="space-y-1">
        <h2 className="text-emphasis text-sm font-semibold">Open in browser to continue</h2>
        <p className="text-default text-xs">
          {`Google Sign-In and sign-up aren't available inside this ${appName} view.`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={openInExternalBrowser} className="flex-1 justify-center rounded-md">
          {t("open_in_browser")}
        </Button>
        <Button color="secondary" onClick={handleCopy} className="flex-1 justify-center rounded-md">
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
      {isIOS && (
        <p className="text-muted text-xs">
          Tap <strong>···</strong> or the share icon in your browser bar, then choose{" "}
          <strong>Open in Safari</strong>.
        </p>
      )}
    </div>
  );
}
