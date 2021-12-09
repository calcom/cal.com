import Glide from "@glidejs/glide";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";

import useMediaQuery from "@lib/hooks/useMediaQuery";

import { getApps } from "../../lib/getApps";
import AppCard from "./AppCard";

interface SliderProps {
  showModalFunction: () => void;
  setSelectedAppFunction: () => void;
}

export default function Slider(props: SliderProps) {
  const apps = getApps();
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
