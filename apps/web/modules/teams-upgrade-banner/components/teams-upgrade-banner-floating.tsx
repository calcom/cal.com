"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import Image from "next/image";
import { createPortal } from "react-dom";
import { UpgradePlanDialog } from "../../billing/components/UpgradePlanDialog";
import { useTeamsUpgradeBanner } from "../hooks/use-teams-upgrade-banner";

const BANNER_IMAGE = {
  src: "/teams_upgrade_banner.png",
  width: 428,
  height: 278,
};

export function TeamsUpgradeBannerFloating(): React.ReactElement | null {
  const { t } = useLocale();
  const {
    shouldShow,
    isDialogOpen,
    openDialog,
    openDialogFromImage,
    closeDialog,
    dismiss,
  } = useTeamsUpgradeBanner();

  if (!shouldShow && !isDialogOpen) return null;

  return (
    <>
      {shouldShow &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-testid="teams-upgrade-banner"
            className="group fixed right-5 bottom-5 z-50 hidden max-w-xs rounded-lg border border-subtle bg-default shadow-lg md:block"
          >
            <div className="p-4">
              <h3
                data-testid="teams-upgrade-banner-title"
                className="font-semibold text-emphasis"
              >
                {t("teams_upgrade_banner_title")}
              </h3>
              <p className="mt-1 text-sm text-subtle">
                {t("teams_upgrade_banner_description")}
              </p>

              <Button
                type="button"
                onClick={dismiss}
                variant="icon"
                StartIcon="x"
                color="minimal"
                className="pointer-events-none absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                aria-label={t("close")}
              />

              <Button
                data-testid="teams-upgrade-banner-cta"
                className="mt-3"
                size="xs"
                color="primary"
                onClick={openDialog}
              >
                {t("teams_upgrade_banner_cta")}
              </Button>
              <Button
                data-testid="teams-upgrade-banner-learn-more"
                className="ml-2"
                size="xs"
                color="secondary"
                onClick={() => {
                  window.open("https://cal.com/teams", "_blank");
                }}
              >
                {t("learn_more")}
              </Button>
            </div>

            <div
              className="cursor-pointer p-1"
              role="button"
              tabIndex={0}
              onClick={openDialogFromImage}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openDialogFromImage();
              }}
            >
              <div
                className="relative w-full"
                style={{
                  aspectRatio: BANNER_IMAGE.width / BANNER_IMAGE.height,
                }}
              >
                <Image
                  src={BANNER_IMAGE.src}
                  alt={t("teams_upgrade_banner_title")}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      <UpgradePlanDialog
        tracking="teams_upgrade_banner"
        target="team"
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />
    </>
  );
}
