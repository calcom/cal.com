import type { UseFormReturn } from "react-hook-form";
import { UptoDateForm } from "routing-forms/components/_components/TestForm";

import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import type { getServerSidePropsForSingleFormViewCalId } from "../components/getServerSidePropsSingleFormCalId";
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
    typeof getServerSidePropsForSingleFormViewCalId
  >["enrichedWithUserProfileForm"];
};
