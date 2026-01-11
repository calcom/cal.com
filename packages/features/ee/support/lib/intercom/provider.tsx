"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type FC } from "react";
import { IntercomProvider } from "react-use-intercom";

import { useBootIntercom } from "@calcom/ee/support/lib/intercom/useIntercom";
import useHasPaidPlan from "@calcom/features/billing/hooks/useHasPaidPlan";
import { IntercomContactForm } from "@calcom/features/ee/support/components/IntercomContactForm";
import { useFlagMap } from "@calcom/features/flags/context/provider";
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const isBeingImpersonated = !!session?.user?.impersonatedBy?.id;

  const shouldOpenSupport =
    pathname === "/event-types" && (searchParams?.has("openPlain") || searchParams?.has("openSupport"));

  useEffect(() => {
    const handleSupportReady = () => {
      if (window.Support) {
        window.Support.shouldShowTriggerButton?.(!isMobile);

        if (shouldOpenSupport) {
          window.Support.open();
          const url = new URL(window.location.href);
          url.searchParams.delete("openPlain");
          url.searchParams.delete("openSupport");
          router.replace(url.pathname + url.search);
        }
      }
    };

    if (window.Support) {
      handleSupportReady();
    } else {
      window.addEventListener("support:ready", handleSupportReady);
    }

    return () => {
      window.removeEventListener("support:ready", handleSupportReady);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenSupport, isMobile]);

  const isOnboardingPage = pathname?.startsWith("/getting-started");
  const isCalVideoPage = pathname?.startsWith("/video/");

  if (isOnboardingPage || isCalVideoPage || isBeingImpersonated) {
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
