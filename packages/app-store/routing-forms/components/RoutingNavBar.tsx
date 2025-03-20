import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";

import { trpc } from "@calcom/trpc";
import { HorizontalTabs } from "@calcom/ui/components/navigation";

import { enabledIncompleteBookingApps } from "../lib/enabledIncompleteBookingApps";
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
  const { data } = trpc.viewer.appRoutingForms.getIncompleteBookingSettings.useQuery({
    formId: form.id,
  });

  const showIncompleteBookingTab = data?.credentials.some((credential) =>
    enabledIncompleteBookingApps.includes(credential?.appId ?? "")
  );

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
    ...(showIncompleteBookingTab
      ? [
          {
            name: "Incomplete Booking",
            href: `${appUrl}/incomplete-booking/${form?.id}`,
          },
        ]
      : []),
  ];
  return (
    <div className="mb-4">
      <HorizontalTabs tabs={tabs} />
    </div>
  );
}
