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
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [size, setSize] = useState(3);

  useEffect(() => {
    if (isMobile) {
      setSize(1);
    } else {
      setSize(3);
    }
  }, [isMobile]);

  return (
    <Slider<App>
      title={t("trending_apps")}
      items={items.filter((app) => !!app.trending)}
      size={size}
      itemKey={(app) => app.name}
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
