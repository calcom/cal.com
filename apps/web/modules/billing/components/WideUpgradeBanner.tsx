"use client";

import { useClientOnly } from "@calcom/lib/hooks/useClientOnly";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBadge, TeamBadge } from "@calcom/web/modules/billing/components/PlanBadge";
import { UpgradePlanDialog } from "@calcom/web/modules/billing/components/UpgradePlanDialog";
import { Button } from "@coss/ui/components/button";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";
import type { UpgradeTarget } from "./types";

const STORAGE_KEY = "dismissed-large-upgrade-banners";

function isDismissed(tracking: string): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const dismissed = JSON.parse(raw) as Record<string, boolean>;
    return dismissed[tracking] === true;
  } catch {
    return false;
  }
}

function dismiss(tracking: string): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  let dismissed: Record<string, boolean> = {};
  if (raw) {
    try {
      dismissed = JSON.parse(raw) as Record<string, boolean>;
    } catch {
      // corrupted data, start fresh
    }
  }
  dismissed[tracking] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
}

export type WideUpgradeBannerProps = {
  tracking: string;
  title: string;
  subtitle?: string;
  target: UpgradeTarget;
  size?: "md" | "sm";
  button?: string | React.ReactNode;
  image?: {
    src: string;
    width: number;
    height: number;
  };
  learnMoreButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
  showBadge?: boolean;
};

export function WideUpgradeBanner({
  tracking,
  title,
  subtitle,
  target,
  size = "md",
  button,
  image,
  learnMoreButton,
  dismissible = true,
  showBadge = true,
}: WideUpgradeBannerProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  useClientOnly(() => {
    setVisible(!isDismissed(tracking));
  });

  if (!visible) return null;

  const isSmall = size === "sm";

  const upgradeButton =
    typeof button === "string" || button === undefined ? (
      <UpgradePlanDialog tracking={tracking} target={target}>
        <Button size={isSmall ? "sm" : "default"} variant="outline">
          {button ?? t("upgrade")}
          <Icon name="arrow-right" />
        </Button>
      </UpgradePlanDialog>
    ) : (
      button
    );

  return (
    <div className="relative flex w-full items-center overflow-hidden rounded-xl bg-muted border-muted border">
      {dismissible && (
        <Button
          variant="ghost"
          className="absolute right-2 top-2 z-10"
          onClick={() => {
            dismiss(tracking);
            setVisible(false);
            posthog.capture("large_upgrade_banner_dismissed", { source: tracking, target });
          }}>
          <Icon name="x" className="h-4 w-4" />
        </Button>
      )}
      {/* Left Content */}
      <div className={`flex flex-1 flex-col p-6${isSmall ? " pr-0" : ""}`}>
        {isSmall ? (
          <div className="flex items-center gap-1.5">
            <h2 className="font-cal text-sm font-semibold leading-none text-default">{title}</h2>
            {showBadge && (target === "team" ? <TeamBadge size="sm" /> : <OrgBadge size="sm" />)}
          </div>
        ) : (
          <div>
            {showBadge && (target === "team" ? <TeamBadge /> : <OrgBadge />)}
            <h2 className="mt-1 font-cal text-lg font-semibold leading-none text-default">{title}</h2>
          </div>
        )}
        {subtitle && <p className={`${isSmall ? "mt-1" : "mt-2"} text-sm font-normal text-subtle`}>{subtitle}</p>}

        {/* Buttons - only shown below text for md size */}
        {!isSmall && (
          <div className="mt-9 flex items-center gap-2">
            {upgradeButton}
            {learnMoreButton &&
              (learnMoreButton.href ? (
                <Button
                  variant="ghost"
                  className="text-subtle"
                  onClick={() =>
                    posthog.capture("large_upgrade_banner_learn_more_clicked", { source: tracking, target })
                  }
                  render={<Link href={learnMoreButton.href} target="_blank" rel="noopener noreferrer" />}>
                  {learnMoreButton.text}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-subtle"
                  onClick={() => {
                    posthog.capture("large_upgrade_banner_learn_more_clicked", { source: tracking, target });
                    learnMoreButton.onClick?.();
                  }}>
                  {learnMoreButton.text}
                </Button>
              ))}
          </div>
        )}
      </div>

      {/* Right side: button for sm, image for md */}
      {isSmall ? (
        <div className={`shrink-0 p-6 pl-4${dismissible ? " pr-6 mt-5" : ""}`}>{upgradeButton}</div>
      ) : (
        image && (
          <div className="relative hidden w-1/2 max-w-[520px] overflow-hidden md:block">
            <Image
              src={image.src}
              alt={title}
              width={image.width}
              height={image.height}
              className="h-full w-full object-cover object-left"
            />
          </div>
        )
      )}
    </div>
  );
}
