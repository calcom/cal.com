import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import React, { cloneElement, useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useRedirectToLoginIfUnauthenticated } from "@calcom/features/auth/lib/hooks/useRedirectToLoginIfUnauthenticated";
import { useRedirectToOnboardingIfNeeded } from "@calcom/features/auth/lib/hooks/useRedirectToOnboardingIfNeeded";
import { useBootIntercom } from "@calcom/features/ee/support/lib/intercom/useIntercom";
import { KBarContent, KBarRoot } from "@calcom/features/kbar/Kbar";
import TimezoneChangeDialog from "@calcom/features/settings/TimezoneChangeDialog";
import classNames from "@calcom/lib/classNames";
import { APP_NAME } from "@calcom/lib/constants";
import { useFormbricks } from "@calcom/lib/formbricks-client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useNotifications } from "@calcom/lib/hooks/useNotifications";
import { Button, ErrorBoundary, HeadSeo, SkeletonText } from "@calcom/ui";

import usePostHog from "../ee/event-tracking/lib/posthog/userPostHog";
import { SideBarContainer } from "./SideBar";
import { TopNavContainer } from "./TopNav";
import { BannerContainer } from "./banners/LayoutBanner";
import { useBanners } from "./banners/useBanners";
import { MobileNavigationContainer } from "./navigation/Navigation";
import { useAppTheme } from "./useAppTheme";

const Layout = (props: LayoutProps) => {
  const { banners, bannersHeight } = useBanners();
  const pathname = usePathname();
  const postHog = usePostHog();
  const isFullPageWithoutSidebar = pathname?.startsWith("/apps/routing-forms/reporting/");
  const pageTitle = typeof props.heading === "string" && !props.title ? props.heading : props.title;
  const withoutSeo = props.withoutSeo ?? props.withoutMain ?? false;
  useBootIntercom();
  useFormbricks();

  useEffect(() => {
    if (!props.isPublic) {
      postHog.identify();
    }
  }, [props.isPublic, postHog]);

  return (
    <>
      {!withoutSeo && (
        <HeadSeo
          title={pageTitle ?? APP_NAME}
          description={props.description ?? props.subtitle?.toString() ?? ""}
        />
      )}
      <div>
        <Toaster position="bottom-right" />
      </div>

      <TimezoneChangeDialog />

      <div className="flex min-h-screen flex-col">
        {banners && !props.isPlatformUser && !isFullPageWithoutSidebar && (
          <BannerContainer banners={banners} />
        )}

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

type DrawerState = [isOpen: boolean, setDrawerOpen: Dispatch<SetStateAction<boolean>>];

export type LayoutProps = {
  centered?: boolean;
  title?: string;
  description?: string;
  heading?: ReactNode;
  subtitle?: ReactNode;
  headerClassName?: string;
  children: ReactNode;
  CTA?: ReactNode;
  large?: boolean;
  MobileNavigationContainer?: ReactNode;
  SidebarContainer?: ReactElement;
  TopNavContainer?: ReactNode;
  drawerState?: DrawerState;
  HeadingLeftIcon?: ReactNode;
  backPath?: string | boolean; // renders back button to specified path
  // use when content needs to expand with flex
  flexChildrenContainer?: boolean;
  isPublic?: boolean;
  withoutMain?: boolean;
  // Gives you the option to skip HeadSEO and render your own.
  withoutSeo?: boolean;
  // Gives the ability to include actions to the right of the heading
  actions?: JSX.Element;
  beforeCTAactions?: JSX.Element;
  afterHeading?: ReactNode;
  smallHeading?: boolean;
  hideHeadingOnMobile?: boolean;
  isPlatformUser?: boolean;
};

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
  const { isLocaleReady, t } = useLocale();

  const { buttonToShow, isLoading, enableNotifications, disableNotifications } = useNotifications();

  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "flex items-center md:mb-6 md:mt-0",
            props.smallHeading ? "lg:mb-7" : "lg:mb-8",
            props.hideHeadingOnMobile ? "mb-0" : "mb-6"
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
                className={classNames("w-full truncate ltr:mr-4 rtl:ml-4 md:block", props.headerClassName)}>
                {props.heading && (
                  <h3
                    className={classNames(
                      "font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full",
                      props.smallHeading ? "text-base" : "text-xl",
                      props.hideHeadingOnMobile && "hidden"
                    )}>
                    {!isLocaleReady ? <SkeletonText invisible /> : props.heading}
                  </h3>
                )}
                {props.subtitle && (
                  <p className="text-default hidden text-sm md:block" data-testid="subtitle">
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
                      : "pwa:bottom-[max(7rem,_calc(5rem_+_env(safe-area-inset-bottom)))] fixed bottom-20 z-40 ltr:right-4 rtl:left-4 md:z-auto md:ltr:right-0 md:rtl:left-0",
                    "flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto"
                  )}>
                  {isLocaleReady && props.CTA}
                </div>
              )}
              {props.actions && props.actions}
              {/* TODO: temporary hide push notifications {props.heading === "Bookings" && buttonToShow && (
                <Button
                  color="primary"
                  onClick={buttonToShow === ButtonState.ALLOW ? enableNotifications : disableNotifications}
                  loading={isLoading}
                  disabled={buttonToShow === ButtonState.DENIED}
                  tooltipSide="bottom"
                  tooltip={
                    buttonToShow === ButtonState.DENIED ? t("you_have_denied_notifications") : undefined
                  }>
                  {t(
                    buttonToShow === ButtonState.DISABLE
                      ? "disable_browser_notifications"
                      : "allow_browser_notifications"
                  )}
                </Button>
              )} */}
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
    <main className="bg-default relative z-0 flex-1 focus:outline-none">
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp}
      <div className="max-w-full px-2 py-4 lg:px-6">
        <ErrorBoundary>
          {!props.withoutMain ? <ShellMain {...props}>{props.children}</ShellMain> : props.children}
        </ErrorBoundary>
        {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
        {!props.backPath ? MobileNavigationContainerProp : null}
      </div>
    </main>
  );
}
