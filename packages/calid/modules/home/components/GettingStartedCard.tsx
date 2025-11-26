"use client";

import { Icon, type IconName } from "@calid/features/ui/components/icon";
import { SkeletonText } from "@calid/features/ui/components/skeleton";
import { useState, useEffect, useMemo } from "react";
import type { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc";

import { ShareModal } from "../utils/ShareModal";

type UserMetadata = z.infer<typeof userMetadata>;
type GettingStartedActions = NonNullable<UserMetadata>["gettingStartedActions"];

interface Step {
  number: number;
  title: string;
  icon: IconName;
  status?: string;
  translateX?: string;
  actionKey: keyof NonNullable<GettingStartedActions>;
}

interface StepConfig {
  number: number;
  titleKey: string;
  icon: IconName;
  translateX?: string;
  actionKey: keyof NonNullable<GettingStartedActions>;
}

const stepConfigs: StepConfig[] = [
  {
    number: 1,
    titleKey: "view_your_public_page",
    icon: "arrow-up-right",
    translateX: "-25%",
    actionKey: "viewPublicPage",
  },
  {
    number: 2,
    titleKey: "update_your_username",
    icon: "user",
    translateX: "-10%",
    actionKey: "updateUsername",
  },
  {
    number: 3,
    titleKey: "add_or_edit_your_events",
    icon: "pencil-line",
    translateX: "-5%",
    actionKey: "addOrEditEvents",
  },
  {
    number: 4,
    titleKey: "set_your_availability",
    icon: "clock-2",
    translateX: "-10%",
    actionKey: "setAvailability",
  },
  {
    number: 5,
    titleKey: "share_your_cal_id",
    icon: "copy",
    translateX: "-25%",
    actionKey: "shareYourCalID",
  },
];

function Skeleton() {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
      <div className="relative flex-shrink-0">
        <div className="bg-emphasis h-32 w-32 animate-pulse rounded-full sm:h-40 sm:w-40" />
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
        {stepConfigs.map((step) => (
          <div key={step.number} className="relative flex w-full items-center">
            <div className="bg-emphasis border-default relative flex w-full min-w-0 animate-pulse items-center gap-2 rounded-full border p-2">
              <div className="bg-emphasis h-8 w-8 flex-shrink-0 rounded-full" />
              <SkeletonText className="h-5 w-48 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GettingStarted({
  userMetadata,
  isLoading,
  username,
}: {
  userMetadata?: UserMetadata;
  isLoading?: boolean;
  username?: string | null;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const gettingStartedActions = userMetadata?.gettingStartedActions;
  const [isMobile, setIsMobile] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const mutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: () => {
      utils.viewer.me.calid_get.invalidate();
    },
    onError: (error) => {
      console.error("Failed to update getting started actions:", error);
    },
  });

  const stepsWithStatus = useMemo<Step[]>(() => {
    const steps: Step[] = stepConfigs.map((config) => ({
      number: config.number,
      title: t(config.titleKey),
      icon: config.icon,
      translateX: config.translateX,
      actionKey: config.actionKey,
    }));

    if (!gettingStartedActions) {
      return steps.map((step) => ({
        ...step,
        status: undefined,
      }));
    }
    return steps.map((step) => ({
      ...step,
      status: gettingStartedActions[step.actionKey] ? "completed" : undefined,
    }));
  }, [gettingStartedActions, t]);

  const navigateToStep = (actionKey: Step["actionKey"]) => {
    const routes: Record<Step["actionKey"], () => void> = {
      viewPublicPage: () => {
        const publicPageUrl = username ? `/${username}` : "";
        window.open(`${WEBAPP_URL}${publicPageUrl}`, "_blank");
      },
      updateUsername: () => window.open(`${WEBAPP_URL}/settings/profile`, "_blank"),
      addOrEditEvents: () => window.open(`${WEBAPP_URL}/event-types`, "_blank"),
      setAvailability: () => window.open(`${WEBAPP_URL}/availability`, "_blank"),
      shareYourCalID: () => {
        setIsShareModalOpen(true);
      },
    };

    routes[actionKey]?.();
  };

  const handleStepClick = (step: Step) => {
    const isAlreadyCompleted = gettingStartedActions?.[step.actionKey] === true;

    if (!isAlreadyCompleted) {
      mutation.mutate({
        metadata: {
          gettingStartedActions: {
            ...(gettingStartedActions || {}),
            [step.actionKey]: true,
          },
        } as any,
      } as any);
    }

    navigateToStep(step.actionKey);
  };

  const completedSteps = stepsWithStatus.filter((step) => step.status === "completed").length;
  const totalSteps = stepsWithStatus.length;

  const shareUrl = `${WEBAPP_URL}${username ? `/${username}` : ""}`;

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} shareUrl={shareUrl} />
      <div className="border-default flex w-full flex-col items-center overflow-hidden rounded-md border px-4 py-6 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-default text-center text-lg font-bold">{t("lets_get_you_started")}</h2>
        </div>

        {isLoading ? (
          <Skeleton />
        ) : (
          <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="relative flex-shrink-0">
              <svg className="h-32 w-32 sm:h-40 sm:w-40" viewBox="0 0 160 160">
                {stepsWithStatus.map((step, index) => {
                  const isCompleted = step.status === "completed";
                  const centerX = 80;
                  const centerY = 80;
                  const radius = 70;
                  const segmentAngle = 72;
                  const startAngle = -90 + index * segmentAngle;
                  const endAngle = startAngle + segmentAngle;

                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;

                  const x1 = centerX + radius * Math.cos(startRad);
                  const y1 = centerY + radius * Math.sin(startRad);
                  const x2 = centerX + radius * Math.cos(endRad);
                  const y2 = centerY + radius * Math.sin(endRad);

                  const largeArcFlag = segmentAngle > 180 ? 1 : 0;

                  const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

                  const arcLength = (2 * Math.PI * radius * segmentAngle) / 360;
                  const dotSize = 4;
                  const gapSize = 8;
                  const dashArray = `${dotSize} ${gapSize}`;

                  return (
                    <path
                      key={step.number}
                      d={pathData}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={dashArray}
                      strokeLinecap="round"
                      className={isCompleted ? "text-active dark:text-muted" : "text-muted dark:text-black"}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-default text-2xl font-bold sm:text-3xl">
                  {Math.round((completedSteps / totalSteps) * 100)}%
                </span>
                <span className="text-default text-xs sm:text-sm">{t("complete")}</span>
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
              {stepsWithStatus.map((step, index) => {
                const isCompleted = step.status === "completed";

                return (
                  <div
                    key={step.number}
                    className="relative flex w-full items-center"
                    style={{
                      transform: !isMobile && step.translateX ? `translateX(${step.translateX})` : "none",
                    }}>
                    {isCompleted ? (
                      <div
                        className="border-default relative flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-full border bg-blue-500 p-2 transition-all duration-300 hover:scale-105 dark:bg-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepClick(step);
                        }}>
                        <div className="border-default pointer-events-none flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border bg-white p-2">
                          <Icon name="check" className="text-default dark:text-black" />
                        </div>
                        <span className="pointer-events-none truncate font-medium text-white dark:text-white">
                          {step.title}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="bg-muted border-default border-default relative flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-full border border p-2 transition-all duration-300 hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepClick(step);
                        }}>
                        <div className="bg-default pointer-events-none flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full p-2">
                          <Icon name={step.icon} className="text-brand-default" />
                        </div>
                        <span className="text-default pointer-events-none truncate font-medium">
                          {step.title}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
