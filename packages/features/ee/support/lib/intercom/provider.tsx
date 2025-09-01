import type { FC } from "react";
import { IntercomProvider } from "react-use-intercom";

import { IntercomContactForm } from "@calcom/features/ee/support/components/IntercomContactForm";
import useHasPaidPlan from "@calcom/lib/hooks/useHasPaidPlan";

const Provider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPaidPlan } = useHasPaidPlan();

  return (
    <IntercomProvider appId={process.env.NEXT_PUBLIC_INTERCOM_APP_ID || ""}>
      {children}
      {!hasPaidPlan && <IntercomContactForm />}
    </IntercomProvider>
  );
};

export default Provider;
