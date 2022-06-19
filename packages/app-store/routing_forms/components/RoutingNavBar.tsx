import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";

export default function RoutingNavBar({ form, appUrl, children }) {
  const tabs = [
    {
      name: "Form",
      href: `${appUrl}/form-edit/${form?.id}`,
    },
    {
      name: "Routing",
      href: `${appUrl}/route-builder/${form?.id}`,
    },
  ];
  return (
    <div className="mb-4">
      <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
      {children}
    </div>
  );
}
