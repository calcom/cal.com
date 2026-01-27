"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import Image from "next/image";
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
    <div
      data-testid="feature-opt-in-banner"
      className="bg-default border-subtle fixed bottom-5 right-5 z-50 max-w-xs rounded-lg border shadow-lg group">
      <div className="p-4">
        <h3 data-testid="feature-opt-in-banner-title" className="text-emphasis text-lg font-semibold">
          {t(featureConfig.i18n.title)}
        </h3>
        <p className="text-subtle mt-1 text-base">{t(featureConfig.i18n.description)}</p>

        <Button
          type="button"
          onClick={onDismiss}
          variant="icon"
          StartIcon="x"
          color="minimal"
          className="absolute top-1.5 right-1.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
          aria-label={t("close")}></Button>

        <Button
          data-testid="feature-opt-in-banner-try-it"
          className="mt-3"
          size="sm"
          color="secondary"
          onClick={onOpenDialog}>
          {t("try_it")}
        </Button>
      </div>

      <div className="p-1">
        <div
          className="relative w-full"
          style={{ aspectRatio: featureConfig.bannerImage.width / featureConfig.bannerImage.height }}>
          <Image
            src={featureConfig.bannerImage.src}
            alt={t(featureConfig.i18n.title)}
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default FeatureOptInBanner;
