import { ReactNode } from "react";

import classNames from "@calcom/lib/classNames";

import Button from "./Button";

export type BaseCardProps = {
  image: string;
  variant: keyof typeof cardTypeByVariant;
  imageProps?: JSX.IntrinsicElements["img"];
  title: string;
  description: string;
  containerProps?: JSX.IntrinsicElements["div"];
  actionButton?: {
    href: string;
    child: ReactNode;
  };
};

const cardTypeByVariant = {
  AppStore: {
    image: "w-10 h-auto",
    card: "p-5 w-64",
  },
  ProfileCard: {
    image: "w-9 h-auto rounded-full mb-4s",
    card: "w-80 p-4 hover:bg-gray-100",
    actionButton: "",
  },
};

export function Card({
  image,
  title,
  description,
  variant,
  actionButton,
  containerProps,
  imageProps,
}: BaseCardProps) {
  return (
    <div
      className={classNames(
        containerProps?.className,
        cardTypeByVariant[variant].card,
        "border-1 rounded-md border-gray-200 bg-white"
      )}
      {...containerProps}>
      <img
        src={image}
        // Stops eslint complaining - not smart enough to realise it comes from ...imageProps
        alt={imageProps?.alt}
        className={classNames(imageProps?.className, cardTypeByVariant[variant].image, "mb-4")}
        {...imageProps}
      />
      <span className="text-base font-bold leading-5 text-gray-900 ">{title}</span>
      <p className="pt-1 text-sm font-normal leading-[18px] text-gray-500">{description}</p>
      {variant === "AppStore" && (
        <Button color="secondary" href={actionButton?.href} size="lg" className="mt-10 w-full">
          {/* Force it to be centered as this usecase of a button is off - doesnt meet normal sizes */}
          <div className="mx-auto">{actionButton?.child}</div>
        </Button>
      )}
    </div>
  );
}
