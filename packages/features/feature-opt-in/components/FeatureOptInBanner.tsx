"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import type { ReactElement } from "react";

interface FeatureOptInBannerProps {
  featureConfig: OptInFeatureConfig;
  onDismiss: () => void;
  onOpenDialog: () => void;
}

export function FeatureOptInBanner({
  featureConfig,
  onDismiss,
  onOpenDialog,
}: FeatureOptInBannerProps): ReactElement {
  const { t } = useLocale();

  return (
    <div className="bg-default border-subtle fixed bottom-5 right-5 z-50 max-w-xs rounded-lg border p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="bg-subtle flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Icon name="sparkles" className="text-emphasis h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-emphasis text-sm font-semibold">{t(featureConfig.i18n.name)}</h3>
          <p className="text-subtle mt-1 text-sm">{t(featureConfig.i18n.description)}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={onOpenDialog}>
              {t("try_it_now")}
            </Button>
            <Button size="sm" color="minimal" onClick={onDismiss}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-subtle hover:text-emphasis shrink-0 rounded p-1 transition-colors"
          aria-label={t("close")}>
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default FeatureOptInBanner;
