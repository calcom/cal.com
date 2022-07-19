import NavTabs from "@components/NavTabs";

import { getSerializableForm } from "../utils";

export default function RoutingNavBar({
  form,
  appUrl,
}: {
  form: ReturnType<typeof getSerializableForm>;
  appUrl: string;
}) {
  const tabs = [
    {
      name: "Fields",
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
      <NavTabs tabs={tabs} />
    </div>
  );
}
