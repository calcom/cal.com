"use client";

import { ReactNode } from "react";

import { TopNavContainer } from "../TopNav";
import { MobileNavigationContainer } from "../navigation/Navigation";

type NavigationWrapperProps = {
  isPlatformUser?: boolean;
  backPath?: string | boolean;
  MobileNavigationContainer?: ReactNode;
  TopNavContainer?: ReactNode;
};

export const NavigationWrapper = ({
  isPlatformUser,
  backPath,
  TopNavContainer: TopNavContainerProp,
  MobileNavigationContainer: MobileNavigationContainerProp,
}: NavigationWrapperProps) => {
  return (
    <>
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp ?? <TopNavContainer />}

      {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
      {!backPath
        ? MobileNavigationContainerProp ?? <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
        : null}
    </>
  );
};
