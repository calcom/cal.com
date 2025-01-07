"use client";

import { ReactNode } from "react";

import { TopNavContainer } from "../TopNav";
import { MobileNavigationContainer } from "./Navigation";

type NavigationWrapperProps = {
  isPlatformUser?: boolean;
  backPath?: string | boolean;
  MobileNavigationContainer?: ReactNode;
  TopNavContainer?: ReactNode;
  children: ReactNode;
};

export const NavigationLayoutAppDir = ({
  isPlatformUser,
  backPath,
  TopNavContainer: TopNavContainerProp,
  MobileNavigationContainer: MobileNavigationContainerProp,
  children,
}: NavigationWrapperProps) => {
  return (
    <>
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp ?? <TopNavContainer />}

      {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
      {!backPath
        ? MobileNavigationContainerProp ?? <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
        : null}
      {children}
    </>
  );
};

export const getLayout = (page: React.ReactElement) => (
  <NavigationLayoutAppDir>{page}</NavigationLayoutAppDir>
);
