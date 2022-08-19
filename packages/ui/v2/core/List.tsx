import Link from "next/link";
import { createElement } from "react";

import classNames from "@calcom/lib/classNames";
import { Icon } from "@calcom/ui/Icon";
import { Button, Tooltip } from "@calcom/ui/v2";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";

import Switch from "./Switch";

export function List(props: JSX.IntrinsicElements["ul"]) {
  return (
    <ul
      {...props}
      className={classNames(
        "-mx-4 divide-y divide-neutral-200 rounded-md border border-l border-r sm:mx-0 sm:overflow-hidden",
        props.className
      )}>
      {props.children}
    </ul>
  );
}

export type ListItemProps = { expanded?: boolean } & ({ href?: never } & JSX.IntrinsicElements["li"]);

export function ListItem(props: ListItemProps) {
  const {
    href,
    expanded,
    heading = "",
    actions = [],
    onToggle = null,
    CTA,
    disabled = false,
    ...passThroughProps
  } = props;
  let subHeading = props.subHeading;
  if (!subHeading) {
    subHeading = "A";
  }
  if (href) {
    return (
      <div
        className={classNames(
          "group flex w-full items-center justify-between p-5 hover:bg-neutral-50",
          disabled ? "hover:bg-white" : ""
        )}>
        <Link passHref href={href}>
          <a
            className={classNames(
              "flex-grow truncate text-sm",
              disabled ? "pointer-events-none cursor-not-allowed opacity-30" : ""
            )}>
            <h1 className="text-sm font-semibold leading-none">{heading}</h1>
            <h2 className="min-h-4 mt-2 text-sm font-normal leading-none">
              {subHeading.substring(0, 100)}
              {subHeading.length > 100 && "..."}
            </h2>
            {CTA}
          </a>
        </Link>
        {props.children}
        {onToggle ? (
          <div className="self-center border-r-2 border-gray-300 pr-2">
            <Switch name="Hidden" checked={!disabled} onCheckedChange={onToggle} />
          </div>
        ) : (
          onToggle
        )}
        {actions
          .filter((action) => action.visibleOutsideDropdown)
          .map((action, key) => {
            let props = {
              type: "button",
              size: "icon",
              color: "minimal",
              StartIcon: action.icon,
              // For Copy link
              // className={classNames(disabled && " opacity-30")}
              className: classNames(!disabled && "group-hover:text-black"),
            };

            if (action.externalLink) {
              props = {
                ...props,
                rel: "noreferrer",
                href: action.externalLink,
                StartIcon: props.icon || Icon.FiExternalLink,
                target: "_blank",
              };
            } else {
              if (action.link) {
                props = {
                  ...props,
                  href: action.link,
                  StartIcon: props.icon,
                };
              }
            }
            if (action.onClick) {
              props = {
                ...props,
                onClick: action.onClick,
              };
            }

            return (
              <div key={key} className="mt-4 hidden flex-shrink-0 sm:mt-0 sm:ml-2 sm:flex">
                <div
                  className={classNames(
                    "flex justify-between space-x-2 rtl:space-x-reverse ",
                    disabled && "pointer-events-none cursor-not-allowed"
                  )}>
                  <Tooltip content={action.label}>
                    <Button {...props} />
                  </Tooltip>
                </div>
              </div>
            );
          })}

        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              color="minimal"
              className={classNames(disabled && " opacity-30")}
              StartIcon={Icon.FiMoreHorizontal}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {actions
              .filter((action) => !action.visibleOutsideDropdown)
              .map((action, key) => {
                const additionalProps = action.props || {};
                let props = {
                  color: "minimal",
                  type: "button",
                  StartIcon: action.icon,
                  className: "rounded-none justify-left w-full",
                  onClick: action.onClick,
                  href: action.link || action.externalLink,
                  disabled,
                  ...additionalProps,
                };
                const Component = action.as || Button;
                if (action.as) {
                  props = {
                    ...props,
                    as: Button,
                  };
                }

                if (action.separator) {
                  return <DropdownMenuSeparator className="h-px bg-gray-200" />;
                }
                return (
                  <DropdownMenuItem key={key} className="outline-none">
                    <Component {...props}>{action.label}</Component>
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuContent>
        </Dropdown>
      </div>
    );
  } else {
    return <span>To Be Implemented</span>;
  }
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
