import Link from "next/link";
import { createElement } from "react";

import classNames from "@calcom/lib/classNames";

export function List(props: JSX.IntrinsicElements["ul"]) {
  return (
    <ul {...props} className={classNames("-mx-4 rounded-sm sm:mx-0 sm:overflow-hidden", props.className)}>
      {props.children}
    </ul>
  );
}

export type ListItemProps = { expanded?: boolean } & ({ href?: never } & JSX.IntrinsicElements["li"]);

export function ListItem(props: ListItemProps) {
  const { href, expanded, ...passThroughProps } = props;

  const elementType = href ? "a" : "li";

  const element = createElement(
    elementType,
    {
      ...passThroughProps,
      className: classNames(
        "items-center rounded-md bg-white min-w-0 flex-1 flex border-neutral-200 p-4 sm:mx-0 md:border md:p-4 xl:mt-0",
        expanded ? "my-2 border" : "border -mb-px last:mb-0",
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

export function ListItemText<TComponent extends keyof JSX.IntrinsicElements = "span">(
  props: JSX.IntrinsicElements[TComponent] & { component?: TComponent }
) {
  const { component = "span", ...passThroughProps } = props;

  return createElement(
    component,
    {
      ...passThroughProps,
      className: classNames("text-sm text-gray-500 truncate", props.className),
    },
    props.children
  );
}
