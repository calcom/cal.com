import Link from "next/link";
import { createElement } from "react";

import classNames from "@lib/classNames";

export function List(props: JSX.IntrinsicElements["ul"]) {
  return (
    <ul {...props} className={classNames("overflow-hidden rounded-sm sm:mx-0 divide", props.className)}>
      {props.children}
    </ul>
  );
}

export function ListItemTitle<TComponent extends keyof JSX.IntrinsicElements = "span">(
  props: JSX.IntrinsicElements[TComponent] & { component?: TComponent }
) {
  const { component = "span", ...passThroughProps } = props;

  return createElement(
    component,
    {
      ...passThroughProps,
      className: classNames("text-sm font-medium text-neutral-900 truncate", props.className),
    },
    props.children
  );
}

export type ListItemProps =
  // | ({ href: LinkProps["href"] } & Omit<JSX.IntrinsicElements["a"], "href">)
  { href?: never } & JSX.IntrinsicElements["li"];

export function ListItem(props: ListItemProps) {
  const { href, ...passThroughProps } = props;

  const elementType = href ? "a" : "li";

  const element = createElement(
    elementType,
    {
      ...passThroughProps,
      className: classNames(
        "items-center bg-white border border-gray-200 min-w-0 flex-1 flex",
        props.className,
        (props.onClick || href) && "hover:bg-neutral-50"
      ),
    },
    props.children
  );

  return href ? (
    <Link passHref href={href}>
      {element}
    </Link>
  ) : (
    element
  );
}

export function ListItemText<TComponent extends keyof JSX.IntrinsicElements = "span">(
  props: JSX.IntrinsicElements[TComponent] & { component?: TComponent }
) {
  const { component = "span", ...passThroughProps } = props;

  return createElement(
    component,
    {
      ...passThroughProps,
      className: classNames("text-sm text-gray-500", props.className),
    },
    props.children
  );
}
