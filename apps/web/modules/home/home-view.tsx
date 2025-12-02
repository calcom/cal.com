"use client";

import { GettingStarted } from "@calid/features/modules/home/components/GettingStartedCard";
import { MoreFeatures } from "@calid/features/modules/home/components/MoreFeaturesCard";
import { MostUsedApps } from "@calid/features/modules/home/components/MostUsedApps";
import { TodaysMeeting } from "@calid/features/modules/home/components/TodaysMeetingCard";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

import Shell from "@calcom/features/shell/Shell";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

export default function HomePage() {
  const { data: user, isLoading } = useMeQuery();
  const userMetadata = user?.metadata as any;
  const username = user?.username;

  return (
    <Shell withoutMain={true}>
      <ShellMainAppDir heading="Home" subtitle="Your central hub for scheduling and managing meetings">
        <div className="flex w-full flex-col items-stretch gap-4 px-2 py-4 lg:flex-row lg:px-0">
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-[4]">
            <GettingStarted userMetadata={userMetadata as any} isLoading={isLoading} username={username} />
            <MoreFeatures />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-[2]">
            <TodaysMeeting />
            <MostUsedApps />
          </div>
        </div>
      </ShellMainAppDir>
    </Shell>
  );
}
