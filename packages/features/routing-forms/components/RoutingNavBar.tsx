import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";

import { HorizontalTabs } from "@calcom/ui";

import type { getSerializableForm } from "../lib/getSerializableForm";
import type { RoutingFormWithResponseCount } from "./SingleForm";

export default function RoutingNavBar({
  form,
  appUrl,
  hookForm,
  setShowInfoLostDialog,
}: {
  form: Awaited<ReturnType<typeof getSerializableForm>>;
  appUrl: string;
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  setShowInfoLostDialog: Dispatch<SetStateAction<boolean>>;
}) {
  const tabs = [
    {
      name: "Form",
      href: `${appUrl}/form-edit/${form?.id}`,
    },
    {
      name: "Routing",
      href: `${appUrl}/route-builder/${form?.id}`,
      onClick: () => {
        if (hookForm.formState.isDirty) {
          setShowInfoLostDialog(true);
        } else {
          window.location.href = `${appUrl}/route-builder/${form?.id}`;
        }
      },
    },
    {
      name: "Reporting",
      target: "_blank",
      href: `${appUrl}/reporting/${form?.id}`,
    },
    {
      name: "Incomplete Booking",
      href: `${appUrl}/incomplete-booking/${form?.id}`,
    },
  ];
  return (
    <div className="mb-4">
      <HorizontalTabs tabs={tabs} />
    </div>
  );
}
