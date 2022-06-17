import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";

export default function RoutingNavBar({ form, children }) {
  const { t } = useLocale();
  const tabs = [
    {
      name: t("Form"),
      href: `/apps/routing_forms/form/${form?.id}`,
    },
    {
      name: t("Routing"),
      href: `/apps/routing_forms/routing/${form?.id}`,
    },
  ];
  return (
    <div className="mb-4">
      <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
      {children}
    </div>
  );
}
