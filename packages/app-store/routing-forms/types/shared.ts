import type { UseFormReturn } from "react-hook-form";
import { UptoDateForm } from "routing-forms/components/_components/TestForm";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { getServerSidePropsForSingleFormView } from "../components/getServerSidePropsSingleForm";
import type { RoutingFormWithResponseCount } from "../types/types";

export type SingleFormComponentProps = {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  Page: React.FC<{
    uptoDateForm: UptoDateForm;
    form: RoutingFormWithResponseCount;
    appUrl: string;
    hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  }>;
  enrichedWithUserProfileForm: inferSSRProps<
    typeof getServerSidePropsForSingleFormView
  >["enrichedWithUserProfileForm"];
};
