import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";

export default function RoutingShell({ children }) {
  const { t } = useLocale();

  const tabs = [
    {
      name: t("Form"),
      href: "/routing/create-form",
    },
    {
      name: t("Routing"),
      href: "/routing/Routing",
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
