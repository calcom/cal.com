import Glide, { Options } from "@glidejs/glide";
import "@glidejs/glide/dist/css/glide.core.min.css";
import "@glidejs/glide/dist/css/glide.theme.min.css";
import { useEffect, useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Icon } from "../../..";
import { SkeletonText } from "../../../components/skeleton";

const Slider = <T extends string | unknown>({
  title = "",
  className = "",
  items,
  itemKey = (item) => `${item}`,
  renderItem,
  options = {},
}: {
  title?: string;
  className?: string;
  items: T[];
  itemKey?: (item: T) => string;
  renderItem?: (item: T) => JSX.Element;
  options?: Options;
}) => {
  const glide = useRef(null);
  const slider = useRef<Glide.Properties | null>(null);
  const { isLocaleReady } = useLocale();
  useEffect(() => {
    if (glide.current) {
      slider.current = new Glide(glide.current, {
        type: "carousel",
        ...options,
      }).mount();
    }

    return () => slider.current?.destroy();
  }, [options]);

  return (
    <div className={`mb-2 ${className}`}>
      <style jsx global>
        {`
          .glide__slide {
            height: auto !important;
          }
        `}
      </style>
      <div className="glide" ref={glide}>
        <div className="flex cursor-default">
          {isLocaleReady ? (
            title && (
              <div>
                <h2 className="mt-0 mb-2 text-lg font-semibold text-gray-900">{title}</h2>
              </div>
            )
          ) : (
            <SkeletonText className="h-4 w-24" />
          )}
          <div className="glide__arrows ml-auto" data-glide-el="controls">
            <button data-glide-dir="<" className="mr-4">
              <Icon.FiArrowLeft className="h-5 w-5 text-gray-600 hover:text-black" />
            </button>
            <button data-glide-dir=">">
              <Icon.FiArrowRight className="h-5 w-5 text-gray-600 hover:text-black" />
            </button>
          </div>
        </div>
        <div className="glide__track" data-glide-el="track">
          <ul className="glide__slides">
            {items.map((item) => {
              if (typeof renderItem !== "function") return null;
              return (
                <li key={itemKey(item)} className="glide__slide h-auto pl-0">
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
