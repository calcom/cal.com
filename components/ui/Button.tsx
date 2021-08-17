import classNames from "@lib/classNames";
import Link, { LinkProps } from "next/link";
import React from "react";

type HTMLAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
type HTMLButtonProps = React.ButtonHTMLAttributes<HTMLButtonProps>;

type SVGComponent = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
export type ButtonProps = {
  color?: "primary" | "secondary";
  size?: "base" | "sm" | "lg";
  loading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  // TODO:
  StartIcon?: SVGComponent;
  EndIcon?: SVGComponent;
} & (
  | //
  (Omit<HTMLAnchorProps, "href"> & { href: LinkProps["href"] })
  | (HTMLButtonProps & { href?: never })
);

export const Button = function Button(props: ButtonProps) {
  const {
    // color = 'default',
    loading = false,
    color = "primary",
    size = "base",
    StartIcon,
    EndIcon,
    ...passThroughProps
  } = props;

  const isLink = !!props.href;
  const elementType = isLink ? "a" : "button";
  const element = React.createElement(
    elementType,
    {
      ...passThroughProps,
      // FIXME style
      className: classNames(
        props.className,
        "inline-flex items-center border border-transparent",
        size === "base" && "px-4 py-2 text-sm font-medium rounded-sm shadow-sm",
        color === "primary" &&
          "border border-transparent text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
      ),
      onClick: props.disabled
        ? (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.preventDefault();
          }
        : props.onClick,
    },
    <>
      {StartIcon && <StartIcon className="inline w-5 h-5 mr-1" />}
      {props.children}
      {loading && (
        <svg
          // TODO vary spinner depending on `size`
          className="w-5 h-5 mx-4 text-white animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {EndIcon && <EndIcon className="inline w-5 h-5 ml-1" />}
    </>
  );
  return props.href ? (
    <Link passHref href={props.href}>
      {element}
    </Link>
  ) : (
    element
  );
};
