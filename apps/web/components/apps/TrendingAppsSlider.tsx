import "@glidejs/glide/dist/css/glide.core.min.css";
import "@glidejs/glide/dist/css/glide.theme.min.css";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";

import useMediaQuery from "@lib/hooks/useMediaQuery";

import AppCard from "./AppCard";
import Slider from "./Slider";

const TrendingAppsSlider = <T extends App>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem?: (item: T) => JSX.Element;
}) => {
  const { t } = useLocale();

  return (
    <Slider<App>
      className="mb-16"
      title={t("trending_apps")}
      items={items.filter((app) => !!app.trending)}
      itemKey={(app) => app.name}
      options={{
        perView: 3,
        breakpoints: {
          /* Under 768px */
          768: {
            perView: 1,
          },
        },
      }}
      renderItem={(app) => (
        <AppCard
          key={app.name}
          name={app.name}
          slug={app.slug}
          description={app.description}
          logo={app.logo}
          rating={app.rating}
          reviews={app.reviews}
        />
      )}
    />
  );
};

export default TrendingAppsSlider;
