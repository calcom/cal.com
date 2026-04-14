import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { CircleAlertIcon } from "@coss/ui/icons";
import { useRef } from "react";

interface ExternalRedirectInterstitialProps {
  isOpen: boolean;
  redirectUrl: string;
  onContinue: () => void;
  onGoBack: () => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return url;
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function ExternalRedirectInterstitial({
  isOpen,
  redirectUrl,
  onContinue,
  onGoBack,
}: ExternalRedirectInterstitialProps) {
  const { t } = useLocale();
  const stableUrlRef = useRef(redirectUrl);
  if (redirectUrl) stableUrlRef.current = redirectUrl;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onGoBack()}>
      <DialogContent type="creation" enableOverflow preventCloseOnOutsideClick>
        <div className="flex">
          <div className="mt-0.5 ltr:mr-3">
            <div className="mx-auto rounded-full bg-attention p-2 text-center">
              <CircleAlertIcon className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="w-full">
            <h2 className="mt-1 font-heading text-2xl text-emphasis">{t("external_redirect_title")}</h2>
            <p className="mt-2 text-sm text-subtle">{t("external_redirect_warning")}</p>
            <p className="mt-4 font-medium text-sm text-subtle">
              {t("host_redirecting_to", { hostname: getHostname(stableUrlRef.current) })}
            </p>
            <div className="mt-1 rounded-md bg-subtle px-3 py-2">
              <p className="break-all font-mono text-emphasis text-sm">{getDisplayUrl(stableUrlRef.current)}</p>
            </div>
          </div>
        </div>
        <div className="my-5 flex flex-row-reverse gap-x-2 sm:my-8">
          <Button color="primary" onClick={onContinue} EndIcon="arrow-right">
            {t("continue")}
          </Button>
          <Button color="secondary" onClick={onGoBack}>
            {t("go_back")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
