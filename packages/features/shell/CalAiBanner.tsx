"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";
import { Icon } from "@calcom/ui/components/icon";

export function CalAiBanner() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("calai-banner-dismissed");
  });

  const handleDismiss = () => {
    localStorage.setItem("calai-banner-dismissed", "true");
    setIsVisible(false);
  };

  const handleTryNow = () => {
    window.open("/workflow/new?action=calAi&templateWorkflowId=wf-11", "_blank");
  };

  if (!isVisible) return null;

  if (!(pathname === "/workflows" || pathname === "/event-types" || pathname === "/bookings/upcoming"))
    return null;

  return (
    <div className="bg-launch-dark relative mb-6 w-full overflow-hidden rounded-lg text-white">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 z-10 rounded-[10px] p-2"
        aria-label="Close banner">
        <Icon name="x" className="h-4 w-4 text-white" />
      </button>

      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-6 pr-6 lg:p-8">
          <h2 className="font-cal font-subtle text-lg">{t("supercharge_your_workflows_with_cal_ai")}</h2>
          <p className="text-subtle mb-4 text-sm">
            {t("supercharge_your_workflows_with_cal_ai_description")}
          </p>

          <button
            onClick={handleTryNow}
            className="rounded-[10px] bg-gradient-to-b from-[#6349EA] to-[#875FE0] px-5 py-2 text-sm font-medium text-white hover:from-[#5A42D1] hover:to-[#7B6FD7]">
            {t("try_now")}
          </button>
        </div>

        <img src="/cal-ai-banner.svg" alt="Cal.ai Banner" className="mt-auto hidden h-40 md:block" />
      </div>
    </div>
  );
}
