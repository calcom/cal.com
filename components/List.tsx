import { LinkProps } from "next/link";
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
        "flex justify-between items-center bg-white border border-gray-200",
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
