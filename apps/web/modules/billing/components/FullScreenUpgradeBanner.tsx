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
  isOrgMember?: boolean;
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
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
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
  isOrgMember,
}: FullScreenUpgradeBannerProps): JSX.Element {
  const [videoOpen, setVideoOpen] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const deviceSpecificOffset = useResponsiveOffset(extraOffset);
  const { t } = useLocale();
  const ref = useFillRemainingHeight(deviceSpecificOffset);

  if (isOrgMember) {
    return (
      <div ref={ref} className="flex w-full shrink-0 items-center justify-center rounded-xl bg-subtle p-8">
        <div className="flex h-full w-full max-w-3xl items-center justify-center rounded-3xl bg-default p-8 shadow-sm md:h-auto">
          <div className="flex flex-col items-center text-center">
            <Icon name="users" className="mb-4 h-12 w-12 text-subtle" />
            <h2 className="font-cal font-semibold text-emphasis text-xl">{t("not_a_member_of_any_team")}</h2>
            <p className="mt-2 text-sm text-subtle">{t("ask_admin_to_invite_you")}</p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex h-full w-full max-w-3xl gap-2 overflow-hidden rounded-3xl bg-default p-5 shadow-sm md:h-auto md:py-8 md:pr-0 md:pl-8">
        {/* Left Content */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden">
          <div className={`${showFeatures ? "overflow-y-auto" : ""} md:overflow-visible`}>
            <div>
              <Badge
                variant="outline"
                className="h-fit! border-0 bg-subtle px-2 py-1 font-medium text-default text-sm">
                {name}
              </Badge>
            </div>
            <h2 className="mt-3 font-cal font-semibold text-emphasis text-xl leading-none">{title}</h2>
            <p className="mt-2 text-sm text-subtle">{subtitle}</p>

            {/* Features List */}
            {features && (
              <>
                <ul className="mt-4 hidden space-y-2 md:block">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-subtle">
                      <span className="text-subtle">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 md:hidden">
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
                        className="mt-2 cursor-pointer font-medium text-emphasis text-sm underline"
                        onClick={() => setShowFeatures(false)}>
                        {t("hide")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer font-medium text-emphasis text-sm underline"
                      onClick={() => setShowFeatures(true)}>
                      {t("show_more")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Image - mobile only, hidden when features are expanded */}
          <div
            className={`${showFeatures ? "hidden" : ""} relative my-4 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-subtle md:hidden`}>
            <BannerImage {...bannerImageProps} />
          </div>

          <div>
            <div className="mt-4 hidden items-center gap-2 md:flex">
              <p className="font-medium text-sm text-subtle">{t("available_on")}</p>
              {target === "team" && <TeamBadge />}
              {(target === "team" || target === "organization") && <OrgBadge />}
            </div>
            <div className="mt-4 h-px w-full border border-t-subtle border-dashed" />
            {/* Buttons */}
            <div className="mt-6 flex items-center justify-between gap-2 md:justify-start">
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
        <div className="relative -my-2 hidden aspect-[3/4] flex-1 items-center justify-center overflow-hidden rounded-l-xl border border-muted border-r-0 bg-subtle md:flex">
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
