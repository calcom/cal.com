import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";

export default function RoutingShell({ children, form, heading }) {
  const { t } = useLocale();
  const tabs = [
    {
      name: t("Form"),
      href: `/apps/routing-forms/form/${form.id}`,
    },
    {
      name: t("Routing"),
      href: `/apps/routing-forms/routing/${form.id}`,
    },
  ];

  return (
    <Shell heading={heading} subtitle="Create form using form builder and route based on inputs to that form">
      <div className="-mx-4 sm:px-6 md:-mx-8 md:px-8">
        <div className="bg-gray-50 px-4 pb-2">
          <div className="mb-4">
            <NavTabs tabs={tabs} linkProps={{ shallow: true }} />
          </div>
          {children}
        </div>
      </div>
    </Shell>
  );
}
