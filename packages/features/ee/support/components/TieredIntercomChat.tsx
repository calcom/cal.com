import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";

import { useIntercom } from "../lib/intercom/useIntercom";
import { IntercomContactForm } from "./IntercomContactForm";

export function TieredIntercomChat() {
  const { hasPaidPlan, isPending } = useHasPaidPlan();

  if (isPending) {
    return null;
  }

  if (hasPaidPlan) {
    return null;
  }

  return <IntercomContactForm />;
}

export function useIntercomChatTrigger() {
  const { hasPaidPlan, isPending } = useHasPaidPlan();
  const { open: openIntercom } = useIntercom();

  const handleChatClick = () => {
    if (hasPaidPlan) {
      openIntercom();
    } else {
      openIntercom();
    }
  };

  return { handleChatClick, isPending };
}
