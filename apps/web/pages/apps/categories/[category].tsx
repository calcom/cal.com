import { ChevronLeftIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";

import { useLocale } from "@lib/hooks/useLocale";

import Shell from "@components/Shell";
import AppCard from "@components/apps/AppCard";
import Button from "@components/ui/Button";

import { appRegistry } from "../appRegistry";

export default function Apps() {
  const { t } = useLocale();
  const router = useRouter();
  const apps = appRegistry();

  return (
    <Shell
      heading={router.query.category + " - " + t("app_store")}
      subtitle={t("app_store_description")}
      large>
      <div className="mb-8">
        <Button color="secondary" href="/apps">
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="mb-16">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">All {router.query.category} apps</h2>
        <div className="grid grid-cols-3 gap-3">
          {apps.map((app) => {
            return (
              app.category === router.query.category && (
                <AppCard
                  key={app.name}
                  slug={app.slug}
                  name={app.name}
                  description={app.description}
                  logo={app.logo}
                  rating={app.rating}
                />
              )
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
