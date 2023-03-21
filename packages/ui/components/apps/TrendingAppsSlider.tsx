import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppFrontendPayload as App } from "@calcom/types/App";

import { AppCard } from "./AppCard";
import { Slider } from "./Slider";

export const TrendingAppsSlider = <T extends App>({ items }: { items: T[] }) => {
  const { t } = useLocale();

  return (
    <Slider<T>
      title={t("trending_apps")}
      items={items.filter((app) => !!app.trending)}
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
