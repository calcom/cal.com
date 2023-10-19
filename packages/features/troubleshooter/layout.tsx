import Link from "next/link";
import type { ComponentProps } from "react";
import React, { Suspense } from "react";

import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ErrorBoundary, Skeleton } from "@calcom/ui";
import { ArrowLeft, Loader } from "@calcom/ui/components/icon";

import { AvailabiltySchedulesContainer } from "./components/AvailabilitySchedulesContainer";
import { CalendarToggleContainer } from "./components/CalendarToggleContainer";
import { ConnectedAppsContainer } from "./components/ConnectedAppsContainer";

const BackButtonInSidebar = ({ name }: { name: string }) => {
  return (
    <Link
      href="/"
      className="tracking-none leading-full sticky inline-flex items-center gap-2 self-stretch text-xl font-semibold">
      <ArrowLeft className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] rtl:rotate-180 md:mt-0" />
      <Skeleton title={name} as="p" className="min-h-4 truncate" loadingClassName="ms-3">
        {name}
      </Skeleton>
    </Link>
  );
};

interface SettingsSidebarContainerProps {
  className?: string;
}

const SettingsSidebarContainer = ({ className = "" }: SettingsSidebarContainerProps) => {
  const { t } = useLocale();

  return (
    <nav
      className={classNames(
        "scroll-bar bg-default border-subtle flex max-h-full max-h-screen w-1/4 flex-col flex-col gap-6 space-y-1 overflow-x-hidden overflow-y-scroll border-r p-6",
        className
      )}
      aria-label="Tabs">
      <>
        <BackButtonInSidebar name={t("troubleshooting")} />
        <CalendarToggleContainer />
        <AvailabiltySchedulesContainer />
        <ConnectedAppsContainer />
      </>
    </nav>
  );
};

export default function TroubleshooterLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  return (
    <Shell
      withoutSeo={true}
      flexChildrenContainer
      hideHeadingOnMobile
      {...rest}
      SidebarContainer={<SettingsSidebarContainer />}>
      <div className="flex flex-1 [&>*]:flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <TroubleshooterLayout>{page}</TroubleshooterLayout>;
