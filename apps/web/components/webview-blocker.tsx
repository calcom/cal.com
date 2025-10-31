"use client";

import { Button } from "@calid/features/ui/components/button";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

import { autoOpenInExternalBrowser, isOpenedInWebView } from "@lib/isWebView";

export default function WebViewBlocker() {
  const [autoRedirectFailed, setAutoRedirectFailed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    if (isOpenedInWebView()) {
      // Try auto-redirect
      const redirected = autoOpenInExternalBrowser();

      if (redirected) {
        // Give it time to redirect
        setTimeout(() => {
          // If still here after 2 seconds, assume redirect failed
          setAutoRedirectFailed(true);
        }, 2000);
      } else {
        // iOS or redirect failed immediately
        setAutoRedirectFailed(true);
      }
    }
  }, []);

  const manualOpen = () => {
    const currentUrl = window.location.href;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
      // Try iOS URL schemes
      window.location.href = `x-safari-https://${currentUrl.replace(/^https?:\/\//, "")}`;

      // Fallback: Copy to clipboard
      setTimeout(() => {
        navigator.clipboard
          .writeText(currentUrl)
          .then(() => {
            alert("URL copied! Please paste in Safari to continue.");
          })
          .catch(() => {
            alert(`Please copy this URL and open in Safari:\n\n${currentUrl}`);
          });
      }, 500);
    } else {
      // Android fallback
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
    }
  };

  return (
    <div className="space-y-3">
      {/* Main Button */}
      <Button
        color="secondary"
        className="text-subtle bg-primary relative w-full justify-center rounded-md"
        CustomStartIcon={
          <div className="mr-2 flex h-5 w-5 items-center justify-center">
            <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        }
        onClick={() => {
          if (autoRedirectFailed) {
            manualOpen();
          } else {
            setShowInstructions(true);
          }
        }}>
        {autoRedirectFailed ? t("open_in_browser") : t("redirecting")}
      </Button>

      {/* Instructions Alert */}
      {(showInstructions || autoRedirectFailed) && (
        <Alert
          severity="warning"
          title={t("open_in_browser_required")}
          message={
            <div className="space-y-3">
              <p className="text-sm">{t("for_security_google_sign_in")}</p>

              {/* Manual Instructions */}
              <div className="rounded-md ">
                <p className="text-emphasis mb-2 text-sm font-medium">{t("manual_instructions")}:</p>
                <ol className="text-default list-inside list-decimal space-y-1 text-xs">
                  <li>
                    Tap the menu icon (<strong>⋯</strong> or <strong>···</strong>)
                  </li>
                  <li>
                    Select <strong>&quot;Open in Safari&quot;</strong> or{" "}
                    <strong>&quot;Open in Browser&quot;</strong>
                  </li>
                  <li>{t("complete_signin_in_opened_browser")}</li>
                </ol>
              </div>

              {/* Action Button */}
              {autoRedirectFailed && (
                <Button onClick={manualOpen} color="primary" size="sm" className="w-full">
                  {t("try_opening_browser")}
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
