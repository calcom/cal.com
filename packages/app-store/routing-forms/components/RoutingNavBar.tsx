import { HorizontalTabs } from "@calcom/ui";

import type { getSerializableForm } from "../lib/getSerializableForm";

export default function RoutingNavBar({
  form,
  appUrl,
}: {
  form: Awaited<ReturnType<typeof getSerializableForm>>;
  appUrl: string;
}) {
  const tabs = [
    {
      name: "Form",
      href: `${appUrl}/form-edit/${form?.id}`,
    },
    {
      name: "Routing",
      href: `${appUrl}/route-builder/${form?.id}`,
    },
    {
      name: "Reporting",
      target: "_blank",
      href: `${appUrl}/reporting/${form?.id}`,
    },
  ];
  return (
    <div className="mb-4">
      <HorizontalTabs tabs={tabs} />
    </div>
  );
}
