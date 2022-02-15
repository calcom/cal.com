import Glide from "@glidejs/glide";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";
import { appRegistry } from "pages/apps/appRegistry";
import { useEffect, useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import useMediaQuery from "@lib/hooks/useMediaQuery";

import AppCard from "./AppCard";

export default function Slider() {
  const apps = appRegistry();
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

  useEffect(() => {
    new Glide(".glide", {
      type: "carousel",
      perView: size,
    }).mount();
  });

  return (
    <div className="mb-16">
      <div className="glide">
        <div className="flex cursor-default">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{t("trending_apps")}</h2>
          </div>
          <div className="glide__arrows ml-auto" data-glide-el="controls">
            <button data-glide-dir="<" className="mr-4">
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 hover:text-black" />
            </button>
            <button data-glide-dir=">">
              <ArrowRightIcon className="h-5 w-5 text-gray-600 hover:text-black" />
            </button>
          </div>
        </div>
        <div className="glide__track" data-glide-el="track">
          <ul className="glide__slides">
            {apps.map((app) => {
              return (
                app.trending && (
                  <li key={app.name} className="glide__slide">
                    <AppCard
                      key={app.name}
                      name={app.name}
                      slug={app.slug}
                      description={app.description}
                      logo={app.logo}
                      rating={app.rating}
                      reviews={app.reviews}
                    />
                  </li>
                )
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
