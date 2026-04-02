"use client";

import { useClientOnly } from "@calcom/lib/hooks/useClientOnly";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBadge, TeamBadge } from "@calcom/web/modules/billing/components/PlanBadge";
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
  subtitle: string;
  target: UpgradeTarget;
  size?: "md" | "sm";
  image: {
    src: string;
    width: number;
    height: number;
  };
  learnMoreButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  children: React.ReactNode;
};

export function WideUpgradeBanner({
  tracking,
  title,
  subtitle,
  target,
  size = "md",
  image,
  learnMoreButton,
  children,
}: WideUpgradeBannerProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  useClientOnly(() => {
    setVisible(!isDismissed(tracking));
  });

  if (!visible) return null;

  return (
    <div className="relative flex w-full overflow-hidden rounded-xl bg-muted border-muted border">
      <Button
        variant="ghost"
        className="absolute right-2 top-2 z-10"
        onClick={() => {
          dismiss(tracking);
          setVisible(false);
          posthog.capture("large_upgrade_banner_dismissed", { source: tracking, target });
        }}>
        {/* This button goes on top of the image, so it's better to force this color */}
        <Icon name="x" className="h-4 w-4 text-gray-700" />
      </Button>
      {/* Left Content */}
      <div className="flex flex-1 flex-col p-6">
        {size === "sm" ? (
          <div className="flex items-start gap-1.5">
            <h2 className="font-cal text-base font-semibold leading-none text-default">{title}</h2>
            <div className="relative -top-1">{target === "team" ? <TeamBadge /> : <OrgBadge />}</div>
          </div>
        ) : (
          <div>
            {target === "team" ? <TeamBadge /> : <OrgBadge />}
            <h2 className="mt-1 font-cal text-lg font-semibold leading-none text-default">{title}</h2>
          </div>
        )}
        <p className="mt-2 text-sm font-normal text-subtle">{subtitle}</p>

        {/* Buttons */}
        <div className={`${size === "sm" ? "mt-4" : "mt-9"} flex items-center gap-2`}>
          {children}
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
      </div>

      {/* Right Content - Image */}
      <div
        className={`relative hidden w-1/2 overflow-hidden md:block${size === "sm" ? " max-w-64" : " max-w-[520px]"}`}>
        <Image src={image.src} alt={title} fill className="object-cover object-left" />
      </div>
    </div>
  );
}
