"use client";

import { useState } from "react";

import { localStorage } from "@calcom/lib/webstorage";
import { Icon } from "@calcom/ui/components/icon";

export function CalAiBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("calai-banner-dismissed");
  });

  const handleDismiss = () => {
    localStorage.setItem("calai-banner-dismissed", "true");
    setIsVisible(false);
  };

  const handleTryNow = () => {
    window.open("/workflows", "_blank");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-launch-dark relative mb-6 w-full overflow-hidden rounded-lg text-white">
      <button
        onClick={handleDismiss}
        className="bg-brand-default absolute right-2 top-2 z-10 rounded-[10px] p-2"
        aria-label="Close banner">
        <Icon name="x" className="h-4 w-4 text-white" />
      </button>

      <div className="flex items-center justify-between p-6 lg:p-8">
        <div className="flex-1 pr-6">
          <h2 className="font-cal font-subtle text-lg">Supercharge your Workflows with Cal.ai</h2>
          <p className="text-subtle mb-4 text-sm">
            Lifelike AI agents that book meetings, send reminders, and follow up with your customers.
          </p>

          <button
            onClick={handleTryNow}
            className="rounded-[10px] bg-gradient-to-b from-[#6349EA] to-[#875FE0] px-5 py-2 text-sm font-medium text-white hover:from-[#5A42D1] hover:to-[#7B6FD7]">
            Try now
          </button>
        </div>

        <img src="/cal-ai-workflow-sidebar.jpg" alt="Cal.ai Banner" className="max-h-sm max-w-36" />
      </div>
    </div>
  );
}
