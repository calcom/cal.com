import Link from "next/link";
import { memo } from "react";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { POWERED_BY_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

type AttributionConfiguration = {
  logoOnly?: boolean;
  hideBranding?: boolean;
  bannerUrl?: string;
};

const BrandingComponent = memo<AttributionConfiguration>(
  ({ logoOnly = false, hideBranding = false, bannerUrl }) => {
    const { t } = useLocale();
    const embedContext = useIsEmbed();

    if (hideBranding && !bannerUrl) {
      return null;
    }

    const attributionStyles = ["text-center", "text-xs", "sm:text-right", embedContext && "max-w-3xl"]
      .filter(Boolean)
      .join(" ");

    const brandImageStyles = "relative -mt-px inline h-[10px] w-auto";

    const creditText = !logoOnly ? <>{t("powered_by")} </> : null;

    if (bannerUrl) {
      return (
        <div className={attributionStyles}>
          {creditText}
          <img
            className={brandImageStyles}
            src={bannerUrl}
            alt="Brand Logo"
            loading="lazy"
            onError={(errorEvent) => {
              const imageElement = errorEvent.target as HTMLImageElement;
              imageElement.src = "/oh-logo-word.svg";
              imageElement.alt = "OneHash Logo";
            }}
          />
        </div>
      );
    }

    return (
      <div className={attributionStyles}>
        <Link
          href={POWERED_BY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-subtle hover:text-emphasis transition-colors duration-200"
          aria-label="Powered by OneHash">
          {creditText}
          <img className={brandImageStyles} src="/oh-logo-word.svg" alt="OneHash Logo" loading="lazy" />
        </Link>
      </div>
    );
  }
);

BrandingComponent.displayName = "BrandingComponent";

export default BrandingComponent;
