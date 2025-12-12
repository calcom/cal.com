// @TODO: turn this into a more generic component that has the same Props API as MUI https://mui.com/material-ui/react-card/
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import Link from "next/link";
import type { ReactNode } from "react";
import React from "react";

import classNames from "@calcom/ui/classNames";

import { Button } from "../button";

const cvaCardTypeByVariant = cva("", {
  // Variants won't have any style by default. Style will only be applied if the variants are combined.
  // So, style is defined in compoundVariants.
  variants: {
    variant: {
      basic: "",
      ProfileCard: "",
      SidebarCard: "",
      NewLaunchSidebarCard: "",
    },
    structure: {
      image: "",
      card: "",
      title: "",
      description: "",
    },
  },
  compoundVariants: [
    // Style for Basic Variants types
    {
      variant: "basic",
      structure: "image",
      className: "w-10 h-auto",
    },
    {
      variant: "basic",
      structure: "card",
      className: "p-5 bg-default",
    },
    {
      variant: "basic",
      structure: "title",
      className: "text-base mt-4",
    },
    {
      variant: "basic",
      structure: "description",
      className: "text-sm leading-[18px] text-subtle font-normal",
    },

    // Style for ProfileCard Variant Types
    {
      variant: "ProfileCard",
      structure: "image",
      className: "w-9 h-auto rounded-full mb-4s",
    },
    {
      variant: "ProfileCard",
      structure: "card",
      className: "w-80 p-4 hover:bg-subtle bg-default",
    },
    {
      variant: "ProfileCard",
      structure: "title",
      className: "text-base",
    },
    {
      variant: "ProfileCard",
      structure: "description",
      className: "text-sm leading-[18px] text-subtle font-normal",
    },

    // Style for SidebarCard Variant Types
    {
      variant: "SidebarCard",
      structure: "image",
      className: "w-9 h-auto rounded-full mb-4s",
    },
    {
      variant: "SidebarCard",
      structure: "card",
      className: "w-full p-3 border border-subtle bg-default",
    },
    {
      variant: "SidebarCard",
      structure: "title",
      className: "text-sm font-cal",
    },
    {
      variant: "SidebarCard",
      structure: "description",
      className: "text-xs text-default line-clamp-2",
    },

    // Style for NewLaunchSidebarCard Variant Types
    {
      variant: "NewLaunchSidebarCard",
      structure: "image",
      className: "w-9 h-auto rounded-full mb-4s",
    },
    {
      variant: "NewLaunchSidebarCard",
      structure: "card",
      className: "w-full p-3 border border-subtle bg-launch-dark text-white",
    },
    {
      variant: "NewLaunchSidebarCard",
      structure: "title",
      className: "text-sm font-cal text-white",
    },
    {
      variant: "NewLaunchSidebarCard",
      structure: "description",
      className: "text-xs text-white",
    },
  ],
});

type CVACardType = Required<Pick<VariantProps<typeof cvaCardTypeByVariant>, "variant">>;

export interface BaseCardProps extends CVACardType {
  image?: string;
  icon?: ReactNode;
  imageProps?: JSX.IntrinsicElements["img"];
  title: string;
  description: ReactNode;
  containerProps?: JSX.IntrinsicElements["div"];
  actionButton?: {
    href?: string;
    child: ReactNode;
    onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    "data-testid"?: string;
  };
  learnMore?: {
    href?: string;
    text: string;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  };
  mediaLink?: string;
  mediaLinkOnClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  thumbnailUrl?: string;
  structure?: string;
  coverPhoto?: string;
  buttonClassName?: string;
}

export function Card({
  image,
  title,
  icon,
  description,
  variant,
  actionButton,
  containerProps,
  imageProps,
  mediaLink,
  thumbnailUrl,
  learnMore,
  coverPhoto,
  buttonClassName,
  mediaLinkOnClick,
}: BaseCardProps) {
  const LinkComponent = learnMore?.href?.startsWith("https") ? "a" : Link;
  return (
    <div
      className={classNames(
        containerProps?.className,
        "border-subtle text-default bg-default flex flex-col justify-between rounded-md border",
        cvaCardTypeByVariant({ variant, structure: "card" })
      )}
      data-testid="card-container"
      {...containerProps}>
      <div>
        {icon && icon}
        {image && (
          <img
            src={image}
            // Stops eslint complaining - not smart enough to realise it comes from ...imageProps
            alt={imageProps?.alt}
            className={classNames(
              imageProps?.className,
              cvaCardTypeByVariant({ variant, structure: "image" })
            )}
            {...imageProps}
          />
        )}
        <h5
          title={title}
          className={classNames(
            "text-emphasis line-clamp-1 font-bold leading-5",
            cvaCardTypeByVariant({ variant, structure: "title" })
          )}>
          {title}
        </h5>
        {description && (
          <p
            title={description.toString()}
            className={classNames(cvaCardTypeByVariant({ variant, structure: "description" }), "pt-1")}>
            {description}
          </p>
        )}
      </div>
      {variant === "SidebarCard" && mediaLink && (
        <a
          onClick={mediaLinkOnClick}
          target="_blank"
          rel="noreferrer noopener"
          href={mediaLink}
          data-testid={actionButton?.["data-testid"]}
          className="group relative my-3 flex aspect-video items-center overflow-hidden rounded">
          <div className="absolute inset-0 bg-black/50 transition group-hover:bg-black/40" />
          <svg
            className="text-inverted absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 transform rounded-full shadow-lg transition-all hover:-mt-px"
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
      {variant === "NewLaunchSidebarCard" && coverPhoto && (
        <img alt="cover" className="mt-3 w-full" src={coverPhoto} />
      )}

      {/* TODO: this should be CardActions https://mui.com/material-ui/api/card-actions/ */}
      {variant === "basic" && actionButton && (
        <div>
          <Button
            color="secondary"
            href={actionButton?.href}
            className="mt-10"
            EndIcon="arrow-right"
            data-testid={actionButton["data-testid"]}>
            {actionButton?.child}
          </Button>
        </div>
      )}

      {(variant === "SidebarCard" || variant === "NewLaunchSidebarCard") && (
        <div className="mt-2 flex items-center justify-between">
          {learnMore && (
            <>
              {learnMore.href ? (
                <LinkComponent
                  href={learnMore.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={learnMore.onClick}
                  className={classNames("text-default text-xs font-medium cursor-pointer", buttonClassName)}>
                  {learnMore.text}
                </LinkComponent>
              ) : learnMore.onClick ? (
                <button type="button"
                  color="minimal"
                  onClick={learnMore.onClick}
                  className={classNames("cursor-pointer text-default text-xs font-medium", buttonClassName)}>
                  {learnMore.text}
                </button>
              ) : undefined}
            </>
          )}
          {actionButton?.child && (
            <button
              className={classNames(
                "text-default hover:text-emphasis p-0 text-xs font-normal cursor-pointer",
                buttonClassName
              )}
              color="minimal"
              data-testid={actionButton?.["data-testid"]}
              onClick={actionButton?.onClick}>
              {actionButton?.child}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Card;
