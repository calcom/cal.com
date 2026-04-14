"use client";

import type { LayoutProps } from "@calcom/features/shell/types";
import { useLocale } from "@calcom/i18n/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { useRedirectToLoginIfUnauthenticated } from "@calcom/web/modules/auth/hooks/useRedirectToLoginIfUnauthenticated";
import { useRedirectToOnboardingIfNeeded } from "@calcom/web/modules/auth/hooks/useRedirectToOnboardingIfNeeded";
import { useFormbricks } from "@calcom/web/modules/formbricks/hooks/useFormbricks";
import TimezoneChangeDialog from "@calcom/web/modules/settings/components/TimezoneChangeDialog";
import { TeamsUpgradeBannerFloating } from "@calcom/web/modules/teams-upgrade-banner/components/teams-upgrade-banner-floating";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { cloneElement } from "react";
import { Toaster } from "sonner";
import { BannerContainer } from "./banners/LayoutBanner";
import { useBanners } from "./banners/useBanners";
import { DynamicModals } from "./DynamicModals";
import { KBarContent, KBarRoot } from "./Kbar";
import { MobileNavigationContainer } from "./navigation/Navigation";
import { SideBarContainer } from "./SideBar";
import { TopNavContainer } from "./TopNav";
import { useAppTheme } from "./useAppTheme";

const Layout = (props: LayoutProps) => {
  const { banners, bannersHeight } = useBanners();

  useFormbricks();

  return (
    <>
      <div>
        <Toaster position="bottom-right" />
      </div>

      <TimezoneChangeDialog />
      <DynamicModals />
      {!props.isPlatformUser && <TeamsUpgradeBannerFloating />}

      <div className="flex min-h-screen flex-col">
        {banners && !props.isPlatformUser && <BannerContainer banners={banners} />}

        <div className="flex flex-1" data-testid="dashboard-shell">
          {props.SidebarContainer ? (
            cloneElement(props.SidebarContainer, { bannersHeight })
          ) : (
            <SideBarContainer isPlatformUser={props.isPlatformUser} bannersHeight={bannersHeight} />
          )}
          <div className="flex w-0 flex-1 flex-col">
            <MainContainer {...props} />
          </div>
        </div>
      </div>
    </>
  );
};

export type { LayoutProps } from "@calcom/features/shell/types";

const KBarWrapper = ({ children, withKBar = false }: { withKBar: boolean; children: React.ReactNode }) =>
  withKBar ? (
    <KBarRoot>
      {children}
      <KBarContent />
    </KBarRoot>
  ) : (
    <>{children}</>
  );

const PublicShell = (props: LayoutProps) => {
  const { status } = useSession();
  return (
    <KBarWrapper withKBar={status === "authenticated"}>
      <Layout {...props} />
    </KBarWrapper>
  );
};

export default function Shell(props: LayoutProps) {
  // if a page is unauthed and isPublic is true, the redirect does not happen.
  useRedirectToLoginIfUnauthenticated(props.isPublic);
  useRedirectToOnboardingIfNeeded();
  useAppTheme();

  return !props.isPublic ? (
    <KBarWrapper withKBar>
      <Layout {...props} />
    </KBarWrapper>
  ) : (
    <PublicShell {...props} />
  );
}

export function ShellMain(props: LayoutProps) {
  const router = useRouter();
  const { isLocaleReady } = useLocale();

  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "mb-0 flex items-center bg-default md:mt-0 md:mb-6",
            props.smallHeading ? "lg:mb-7" : "lg:mb-8",
            !props.disableSticky && "sticky top-11 sm:top-16 md:top-0 z-10 py-3 lg:mb-5 -mt-3 lg:-mt-3"
          )}>
          {!!props.backPath && (
            <Button
              variant="icon"
              size="sm"
              color="minimal"
              onClick={() =>
                typeof props.backPath === "string" ? router.push(props.backPath as string) : router.back()
              }
              StartIcon="arrow-left"
              aria-label="Go Back"
              className="rounded-md ltr:mr-2 rtl:ml-2"
              data-testid="go-back-button"
            />
          )}
          {props.heading && (
            <header
              className={classNames(props.large && "py-8", "flex w-full max-w-full items-center truncate")}>
              {props.HeadingLeftIcon && <div className="ltr:mr-4">{props.HeadingLeftIcon}</div>}
              <div
                className={classNames("w-full truncate md:block ltr:mr-4 rtl:ml-4", props.headerClassName)}>
                {props.heading && (
                  <h3
                    className={classNames(
                      "hidden max-w-28 truncate font-heading font-semibold text-emphasis text-lg tracking-wide sm:max-w-72 sm:text-xl md:block md:max-w-80 xl:max-w-full",
                      props.smallHeading ? "text-base" : "text-xl"
                    )}>
                    {!isLocaleReady ? <SkeletonText invisible /> : props.heading}
                  </h3>
                )}
                {props.subtitle && (
                  <p className="hidden text-default text-sm md:block" data-testid="subtitle">
                    {!isLocaleReady ? <SkeletonText invisible /> : props.subtitle}
                  </p>
                )}
              </div>
              {props.beforeCTAactions}
              {props.CTA && (
                <div
                  className={classNames(
                    props.backPath
                      ? "relative"
                      : "fixed bottom-20 pwa:bottom-[max(7rem,_calc(5rem_+_env(safe-area-inset-bottom)))] z-40 md:z-auto ltr:right-4 md:ltr:right-0 rtl:left-4 md:rtl:left-0",
                    "shrink-0 [-webkit-app-region:no-drag] md:relative md:right-auto md:bottom-auto"
                  )}>
                  {isLocaleReady && props.CTA}
                </div>
              )}
              {props.actions && props.actions}
            </header>
          )}
        </div>
      )}
      {props.afterHeading && <>{props.afterHeading}</>}
      <div className={classNames(props.flexChildrenContainer && "flex flex-1 flex-col")}>
        {props.children}
      </div>
    </>
  );
}

function MainContainer({
  isPlatformUser,
  MobileNavigationContainer: MobileNavigationContainerProp = (
    <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
  ),
  TopNavContainer: TopNavContainerProp = <TopNavContainer />,
  ...props
}: LayoutProps) {
  return (
    <main className="relative z-0 flex-1 bg-default focus:outline-none">
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp}
      <div className="max-w-full p-2 sm:p-4 lg:p-6">
        <ErrorBoundary>
          {!props.withoutMain ? <ShellMain {...props}>{props.children}</ShellMain> : props.children}
        </ErrorBoundary>
        {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
        {!props.backPath ? MobileNavigationContainerProp : null}
      </div>
    </main>
  );
}
