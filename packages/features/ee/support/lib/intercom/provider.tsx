"use client";

import { usePathname } from "next/navigation";
import { useEffect, type FC } from "react";
import { IntercomProvider } from "react-use-intercom";

import { useBootIntercom } from "@calcom/ee/support/lib/intercom/useIntercom";
import { IntercomContactForm } from "@calcom/features/ee/support/components/IntercomContactForm";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import useHasPaidPlan from "@calcom/lib/hooks/useHasPaidPlan";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

function IntercomBootstrap() {
  useBootIntercom();
  return null;
}

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPaidPlan } = useHasPaidPlan();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const flagMap = useFlagMap();

  useEffect(() => {
    if (window.Support) {
      window.Support.shouldShowTriggerButton(!isMobile);
    }
  }, [isMobile]);

  const pathname = usePathname();
  const isOnboardingPage = pathname?.startsWith("/getting-started");
  const isCalVideoPage = pathname?.startsWith("/video/");

  if (isOnboardingPage || isCalVideoPage) {
    return <>{children}</>;
  }

  if (flagMap["tiered-support-chat"] && !hasPaidPlan) {
    return (
      <>
        {children}
        <IntercomContactForm />
      </>
    );
  }

  return (
    <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID || ""}>
      <IntercomBootstrap />
      {children}
    </IntercomProvider>
  );
};

export default Provider;
