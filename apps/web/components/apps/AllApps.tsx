import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import AppCard from "./AppCard";

export default function AllApps({ apps }: { apps: App[] }) {
  const { t } = useLocale();

  return (
    <div className="mb-16">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{t("all_apps")}</h2>
      <div className="grid-col-1 grid grid-cols-1 gap-3 md:grid-cols-3">
        {apps.map((app) => (
          <AppCard key={app.name} app={app} />
        ))}
      </div>
    </div>
  );
}
