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
      className: "pointer-events-none opacity-30 lg:pointer-events-auto lg:opacity-100",
    },
    {
      name: "Reporting",
      href: `${appUrl}/reporting/${form?.id}`,
      className: "pointer-events-none opacity-30 lg:pointer-events-auto lg:opacity-100",
    },
  ];
  return (
    <div className="mb-4">
      <HorizontalTabs tabs={tabs} />
    </div>
  );
}
