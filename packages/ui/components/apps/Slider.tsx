import type { Options } from "@glidejs/glide";
import Glide from "@glidejs/glide";
import "@glidejs/glide/dist/css/glide.core.min.css";
import "@glidejs/glide/dist/css/glide.theme.min.css";
import type { ComponentProps, FC } from "react";
import { useEffect, useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { FiArrowLeft, FiArrowRight } from "../icon";
import { SkeletonText } from "../skeleton";

const SliderButton: FC<ComponentProps<"button">> = (props) => {
  const { children, ...rest } = props;
  return (
    <button className="rounded p-2.5 text-gray-700 hover:bg-gray-100" {...rest}>
      {children}
    </button>
  );
};

export const Slider = <T extends string | unknown>({
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
      <div className="glide" ref={glide}>
        <div className="flex cursor-default items-center pb-3">
          {isLocaleReady ? (
            title && (
              <div>
                <h2 className="mt-0 text-base font-semibold leading-none text-gray-900">{title}</h2>
              </div>
            )
          ) : (
            <SkeletonText className="h-4 w-24" />
          )}
          <div className="glide__arrows ml-auto flex items-center gap-x-1" data-glide-el="controls">
            <SliderButton data-glide-dir="<">
              <FiArrowLeft className="h-5 w-5" />
            </SliderButton>
            <SliderButton data-glide-dir=">">
              <FiArrowRight className="h-5 w-5" />
            </SliderButton>
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
