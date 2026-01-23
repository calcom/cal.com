import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";

import { AppCard } from "./AppCard";
import { Slider } from "./Slider";

export const PopularAppsSlider = <T extends App>({ items }: { items: T[] }) => {
  const { t } = useLocale();

  return (
    <Slider<T>
      title={t("most_popular")}
      items={items.sort((a, b) => (b.installCount || 0) - (a.installCount || 0))}
      itemKey={(app) => app.name}
      options={{
        perView: 3,
        breakpoints: {
          768 /* and below */: {
            perView: 1,
          },
        },
      }}
      renderItem={(app) => <AppCard app={app} />}
    />
  );
};
