"use client";

import { GettingStarted } from "@calid/features/modules/home/components/GettingStartedCard";
import { Meetings } from "@calid/features/modules/home/components/MeetingsCard";
import { MoreFeatures } from "@calid/features/modules/home/components/MoreFeaturesCard";
import { MostUsedApps } from "@calid/features/modules/home/components/MostUsedApps";
import { triggerToast } from "@calid/features/ui/components/toast";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { useEffect, useRef } from "react";

import Shell from "@calcom/features/shell/Shell";
import { sessionStorage } from "@calcom/lib/webstorage";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

export default function HomePage() {
  const hasShownCalendlyToastRef = useRef(false);
  const { data: user, isLoading } = useMeQuery();
  const userMetadata = user?.metadata as any;
  const username = user?.username;

  useEffect(() => {
    if (hasShownCalendlyToastRef.current) return;

    // Move the short-lived callback cookie into sessionStorage first.
    if (document.cookie.includes("calendly_sync_toast=1")) {
      sessionStorage.setItem("calendly_sync_toast", "1");
      document.cookie = "calendly_sync_toast=; Max-Age=0; path=/";
    }

    if (sessionStorage.getItem("calendly_sync_toast") !== "1") return;

    hasShownCalendlyToastRef.current = true;
    triggerToast("Data will import within 24 hours!", "success");
    sessionStorage.removeItem("calendly_sync_toast");
  }, []);

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir heading="Home" subtitle="Your central hub for scheduling and managing meetings">
        <div className="flex w-full flex-col items-stretch gap-4 px-2 py-4 lg:flex-row lg:px-0">
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-[4]">
            <GettingStarted userMetadata={userMetadata as any} isLoading={isLoading} username={username} />
            <MoreFeatures />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-[2]">
            <Meetings />
            <MostUsedApps />
          </div>
        </div>
      </ShellMainAppDir>
    </Shell>
  );
}
