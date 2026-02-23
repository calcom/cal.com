"use client";

import { useFillRemainingHeight } from "@calcom/lib/hooks/useFillRemainingHeight";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBadge, TeamBadge } from "@calcom/web/modules/billing/components/PlanBadge";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";
import type { UpgradeTarget } from "./types";

export type { UpgradeTarget };

export type FullScreenUpgradeBannerProps = {
  tracking: string;
  name: string;
  title: string;
  subtitle: string;
  features?: string[];
  target: UpgradeTarget;
  learnMoreButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  extraOffset?:
    | number
    | {
        mobile?: number;
        tablet?: number;
        desktop?: number;
      };
  image: {
    src: string;
    width: number;
    height: number;
  };
  youtubeId?: string;
};

function useResponsiveOffset(
  extraOffset?:
    | number
    | {
        mobile?: number;
        tablet?: number;
        desktop?: number;
      }
) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return typeof extraOffset === "number" ? extraOffset : (extraOffset?.mobile ?? 74);
  } else if (isTablet) {
    return typeof extraOffset === "number" ? extraOffset : (extraOffset?.tablet ?? 85);
  } else {
    return typeof extraOffset === "number" ? extraOffset : (extraOffset?.desktop ?? 24);
  }
}

function BannerImage({
  image,
  name,
  youtubeId,
  tracking,
  target,
  onPlayVideo,
}: {
  image: { src: string; width: number; height: number };
  name: string;
  youtubeId?: string;
  tracking: string;
  target: UpgradeTarget;
  onPlayVideo: () => void;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <>
      <Image
        src={image.src}
        alt={name}
        width={image.width}
        height={image.height}
        className="h-full w-full object-cover object-top"
      />
      {youtubeId && (
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={() => {
            posthog.capture("fullscreen_upgrade_banner_video_played", { source: tracking, target });
            onPlayVideo();
          }}>
          <Image src="/play_button.svg" alt={t("play_video")} width={48} height={48} />
        </button>
      )}
    </>
  );
}

export function FullScreenUpgradeBanner({
  tracking,
  name,
  title,
  subtitle,
  features,
  target,
  learnMoreButton,
  extraOffset,
  image,
  youtubeId,
}: FullScreenUpgradeBannerProps): JSX.Element {
  const [videoOpen, setVideoOpen] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const deviceSpecificOffset = useResponsiveOffset(extraOffset);
  const { t } = useLocale();
  const ref = useFillRemainingHeight(deviceSpecificOffset);

  const bannerImageProps = {
    image,
    name,
    youtubeId,
    tracking,
    target,
    onPlayVideo: () => setVideoOpen(true),
  };

  return (
    <div ref={ref} className="flex w-full shrink-0 items-center justify-center rounded-xl bg-subtle p-8">
      <div className="flex w-full h-full md:h-auto max-w-3xl gap-2 overflow-hidden rounded-3xl bg-default p-5 md:py-8 md:pl-8 md:pr-0 shadow-sm">
        {/* Left Content */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div className={`${showFeatures ? "overflow-y-auto" : ""} md:overflow-visible`}>
            <div>
              <Badge
                variant="outline"
                className="text-sm text-default font-medium bg-subtle px-2 py-1 h-fit! border-0">
                {name}
              </Badge>
            </div>
            <h2 className="mt-3 font-cal font-semibold text-emphasis text-xl leading-none">{title}</h2>
            <p className="mt-2 text-subtle text-sm">{subtitle}</p>

            {/* Features List */}
            {features && (
              <>
                <ul className="mt-4 space-y-2 hidden md:block">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-subtle">
                      <span className="text-subtle">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="md:hidden mt-4">
                  {showFeatures ? (
                    <>
                      <ul className="space-y-2">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-subtle">
                            <span className="text-subtle">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-2 text-sm text-emphasis font-medium cursor-pointer underline"
                        onClick={() => setShowFeatures(false)}>
                        {t("hide")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-emphasis font-medium cursor-pointer underline"
                      onClick={() => setShowFeatures(true)}>
                      {t("show_more")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Image - mobile only, hidden when features are expanded */}
          <div className={`${showFeatures ? "hidden" : ""} md:hidden my-4 flex items-center justify-center rounded-xl bg-subtle aspect-[3/4] overflow-hidden relative`}>
            <BannerImage {...bannerImageProps} />
          </div>

          <div>
            <div className="hidden md:flex items-center gap-2 mt-4">
              <p className="text-sm font-medium text-subtle">{t("available_on")}</p>
              {target === "team" && <TeamBadge />}
              {(target === "team" || target === "organization") && <OrgBadge />}
            </div>
            <div className="mt-4 h-px w-full border border-t-subtle border-dashed" />
            {/* Buttons */}
            <div className="mt-6 flex items-center justify-between md:justify-start gap-2">
              <UpgradePlanDialog
                tracking={tracking}
                info={{
                  title,
                  description: subtitle,
                }}
                target={target}>
                <Button
                  onClick={() =>
                    posthog.capture("fullscreen_upgrade_banner_cta_clicked", { source: tracking, target })
                  }>
                  {t("try_for_free")}
                  <Icon name="arrow-right" />
                </Button>
              </UpgradePlanDialog>
              {learnMoreButton &&
                (learnMoreButton.href ? (
                  <Button
                    variant="ghost"
                    className="text-subtle"
                    onClick={() =>
                      posthog.capture("fullscreen_upgrade_banner_learn_more_clicked", {
                        source: tracking,
                        target,
                      })
                    }
                    render={<Link href={learnMoreButton.href} target="_blank" rel="noopener noreferrer" />}>
                    {learnMoreButton.text}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-subtle"
                    onClick={() => {
                      posthog.capture("fullscreen_upgrade_banner_learn_more_clicked", {
                        source: tracking,
                        target,
                      });
                      learnMoreButton.onClick?.();
                    }}>
                    {learnMoreButton.text}
                  </Button>
                ))}
            </div>
          </div>
        </div>

        {/* Right Content - Image */}
        <div className="-my-2 hidden md:flex flex-1 items-center justify-center rounded-l-xl bg-subtle aspect-[3/4] overflow-hidden border border-muted border-r-0 relative">
          <BannerImage {...bannerImageProps} />
        </div>
      </div>

      {youtubeId && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogPopup className="max-w-3xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>
                {t("available_on_plan", { plan: target === "organization" ? t("organization") : t("team") })}
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video w-full px-6 pb-6">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full rounded-lg border border-muted"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  posthog.capture("fullscreen_upgrade_banner_video_dismissed", { source: tracking, target });
                  setVideoOpen(false);
                }}>
                {t("dismiss")}
              </Button>
              <UpgradePlanDialog
                tracking={tracking}
                info={{
                  title,
                  description: subtitle,
                }}
                target={target}>
                <Button
                  onClick={() =>
                    posthog.capture("fullscreen_upgrade_banner_video_cta_clicked", {
                      source: tracking,
                      target,
                    })
                  }>
                  {t("get_started")}
                  <Icon name="arrow-right" />
                </Button>
              </UpgradePlanDialog>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      )}
    </div>
  );
}
