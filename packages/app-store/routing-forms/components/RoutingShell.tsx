import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";

export default function RoutingShell({ children, formId }) {
  const { t } = useLocale();
  const tabs = [
    {
      name: t("Form"),
      href: `/apps/routing-forms/form/${formId}`,
    },
    {
      name: t("Routing"),
      href: `/apps/routing-forms/routing/${formId}`,
    },
  ];
  return (
    <Shell>
      <div className="-mx-4 md:-mx-8">
        <div className="mb-10 bg-gray-50 px-4 pb-2">
          <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
          {children}
        </div>
      </div>
    </Shell>
  );
}
