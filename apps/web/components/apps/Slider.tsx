import Glide from "@glidejs/glide";
import "@glidejs/glide/dist/css/glide.core.min.css";
import "@glidejs/glide/dist/css/glide.theme.min.css";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";
import { useEffect, useRef } from "react";

const Slider = <T extends unknown>({
  title = "",
  items,
  size = 3,
  itemKey = (item) => `${item}`,
  renderItem,
}: {
  title?: string;
  items: T[];
  size?: number;
  itemKey?: (item: T) => string;
  renderItem?: (item: T) => JSX.Element;
}) => {
  const glide = useRef(null);

  useEffect(() => {
    if (glide.current) {
      const slider = new Glide(glide.current, {
        type: "carousel",
        perView: size,
      });

      slider.mount();
    }

    // @ts-ignore TODO: This method is missing in types
    return () => slider.destroy();
  }, [size]);

  return (
    <div className="mb-16">
      <style jsx global>
        {`
          .glide__slide {
            height: auto !important;
          }
        `}
      </style>
      <div className="glide" ref={glide}>
        <div className="flex cursor-default">
          {title && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          )}
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
            {items.map((item) => {
              if (typeof renderItem !== "function") return null;
              return (
                <li key={itemKey(item)} className="glide__slide h-auto">
                  {renderItem(item)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Slider;
