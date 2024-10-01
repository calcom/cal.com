import { useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";

const EventPaymentsTabPlatformWrapper = () => {
  const formMethods = useFormContext<FormValues>();
  formMethods.getValues("metadata.apps.stripe.enabled");

  return <div>This is the event payments tab to be used for platform!</div>;
};

export default EventPaymentsTabPlatformWrapper;
