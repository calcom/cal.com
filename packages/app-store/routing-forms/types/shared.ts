import type { UseFormReturn } from "react-hook-form";
import type { getServerSidePropsForSingleFormView } from "routing-forms/components/getServerSidePropsSingleForm";
import type { RoutingFormWithResponseCount } from "routing-forms/types/types";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

export type SingleFormComponentProps = {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  Page: React.FC<{
    form: RoutingFormWithResponseCount;
    appUrl: string;
    hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  }>;
  enrichedWithUserProfileForm: inferSSRProps<
    typeof getServerSidePropsForSingleFormView
  >["enrichedWithUserProfileForm"];
};
