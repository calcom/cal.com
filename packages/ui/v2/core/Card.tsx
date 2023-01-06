import Link from "next/link";
import { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/lib/classNames";

import { Button } from "../../components/button";

export type BaseCardProps = {
  image?: string;
  variant: keyof typeof cardTypeByVariant;
  imageProps?: JSX.IntrinsicElements["img"];
  title: string;
  description: ReactNode;
  containerProps?: JSX.IntrinsicElements["div"];
  actionButton?: {
    href?: string;
    child: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  };
  learnMore?: {
    href: string;
    text: string;
  };
  mediaLink?: string;
  thumbnailUrl?: string;
};

const cardTypeByVariant = {
  AppStore: {
    image: "w-10 h-auto",
    card: "p-5 w-64",
    title: "text-base",
    description: "text-sm leading-[18px] text-gray-500 font-normal",
  },
  ProfileCard: {
    image: "w-9 h-auto rounded-full mb-4s",
    card: "w-80 p-4 hover:bg-gray-100",
    title: "text-base",
    description: "text-sm leading-[18px] text-gray-500 font-normal",
  },
  SidebarCard: {
    image: "w-9 h-auto rounded-full mb-4s",
    card: "w-full p-3 border border-gray-200",
    title: "text-sm font-cal",
    description: "text-xs text-gray-600 line-clamp-2",
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
  mediaLink,
  thumbnailUrl,
  learnMore,
}: BaseCardProps) {
  return (
    <div
      className={classNames(
        containerProps?.className,
        cardTypeByVariant[variant].card,
        "border-1 rounded-md border-gray-200 bg-white"
      )}
      {...containerProps}>
      {image && (
        <img
          src={image}
          // Stops eslint complaining - not smart enough to realise it comes from ...imageProps
          alt={imageProps?.alt}
          className={classNames(imageProps?.className, cardTypeByVariant[variant].image, "mb-4")}
          {...imageProps}
        />
      )}
      <h5
        title={title}
        className={classNames(
          cardTypeByVariant[variant].title,
          "line-clamp-1 font-bold leading-5 text-gray-900"
        )}>
        {title}
      </h5>
      {description && (
        <p
          title={description.toString()}
          className={classNames(cardTypeByVariant[variant].description, "pt-1")}>
          {description}
        </p>
      )}
      {variant === "SidebarCard" && (
        <a
          onClick={actionButton?.onClick}
          target="_blank"
          rel="noreferrer"
          href={mediaLink}
          className="group relative my-3 flex aspect-video items-center overflow-hidden rounded">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity group-hover:bg-opacity-40" />
          <svg
            className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 transform rounded-full text-white shadow-lg hover:-mt-px"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z"
              fill="white"
            />
            <path
              d="M12.1667 8.5L23.8334 16L12.1667 23.5V8.5Z"
              fill="#111827"
              stroke="#111827"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <img alt="play feature video" src={thumbnailUrl} />
        </a>
      )}
      {variant === "AppStore" && (
        <Button color="secondary" href={actionButton?.href} size="lg" className="mt-10 w-full">
          {/* Force it to be centered as this usecase of a button is off - doesnt meet normal sizes */}
          <div className="mx-auto">{actionButton?.child}</div>
        </Button>
      )}
      {variant === "SidebarCard" && (
        <div className="mt-2 flex items-center justify-between">
          {learnMore && (
            <Link
              href={learnMore.href}
              onClick={actionButton?.onClick}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium">
              {learnMore.text}
            </Link>
          )}
          <button
            className="p-0 text-xs font-normal text-gray-600 hover:text-gray-800"
            color="minimal"
            onClick={actionButton?.onClick}>
            {actionButton?.child}
          </button>
        </div>
      )}
    </div>
  );
}

export default Card;
