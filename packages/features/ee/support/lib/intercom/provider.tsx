import { useEffect, type FC } from "react";
import { IntercomProvider } from "react-use-intercom";

import { IntercomContactForm } from "@calcom/features/ee/support/components/IntercomContactForm";
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

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPaidPlan } = useHasPaidPlan();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (window.Support) {
      window.Support.shouldShowTriggerButton(!isMobile);
    }
  }, [isMobile]);

  return (
    <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID || ""}>
      {children}
      {!hasPaidPlan && <IntercomContactForm />}
    </IntercomProvider>
  );
};

export default Provider;
