import { HorizontalTabs } from "@calcom/ui/v2";

import { getSerializableForm } from "../lib/getSerializableForm";

export default function RoutingNavBar({
  form,
  appUrl,
}: {
  form: ReturnType<typeof getSerializableForm>;
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
      className: "hidden lg:block",
    },
  ];
  return (
    <div className="mb-4">
      <HorizontalTabs tabs={tabs} />
    </div>
  );
}
