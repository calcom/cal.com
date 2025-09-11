import type { UseFormReturn } from "react-hook-form";

import type { getSerializableForm } from "../lib/getSerializableForm";
import type { RoutingFormWithResponseCount } from "../types/types";

export type SingleFormComponentProps = {
  form: RoutingFormWithResponseCount;
  appUrl: string;
  Page: React.FC<{
    form: RoutingFormWithResponseCount;
    appUrl: string;
    hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  }>;
  enrichedWithUserProfileForm: Awaited<ReturnType<typeof getSerializableForm>>;
  permissions: {
    canCreate: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
};
