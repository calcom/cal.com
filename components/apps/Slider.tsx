import Glide from "@glidejs/glide";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";
import { useEffect } from "react";

import { getApps } from "../../lib/getApps";
import AppCard from "./AppCard";

interface SliderProps {
  showModalFunction: () => void;
  setSelectedAppFunction: () => void;
}

export default function Slider(props: SliderProps) {
  const apps = getApps();

  useEffect(() => {
    new Glide(".glide", {
      type: "carousel",
      perView: 3,
    }).mount();
  });

  return (
    <div className="mb-16">
      <div className="glide">
        <div className="flex cursor-default">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Trending apps</h2>
          </div>
          <div className="ml-auto glide__arrows" data-glide-el="controls">
            <button data-glide-dir="<" className="mr-4">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 hover:text-black" />
            </button>
            <button data-glide-dir=">">
              <ArrowRightIcon className="w-5 h-5 text-gray-600 hover:text-black" />
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
                      description={app.description}
                      logo={app.logo}
                      rating={app.rating}
                      reviews={app.reviews}
                      showModalFunction={props.showModalFunction}
                      setSelectedAppFunction={props.setSelectedAppFunction}
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
