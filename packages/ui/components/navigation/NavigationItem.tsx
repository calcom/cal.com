import { cva } from "class-variance-authority";
import { Fragment } from "react";

import classNames from "@calcom/ui/classNames";

import { ButtonOrLink } from "../dropdown";
import { Icon } from "../icon";
import type { IconName } from "../icon";

export type NavigationItemType = {
  isLastChild?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  name: string;
  href?: string;
  isLoading?: boolean;
  badge?: React.ReactNode;
  icon?: IconName;
  child?: NavigationItemType[];
  onlyMobile?: boolean;
  onlyDesktop?: boolean;
  moreOnMobile?: boolean;
  isCurrent?: boolean;
};

const navigationItemStyles = cva(
  "text-default group flex items-center rounded-[10px] p-2 text-sm font-medium transition hover:bg-subtle hover:text-emphasis",
  {
    variants: {
      isChild: {
        true: "[&[aria-current='page']]:text-emphasis [&[aria-current='page']]:bg-emphasis hidden h-8 ml-16 lg:flex lg:ml-10 relative before:absolute before:left-[-24px] before:-top-2 before:h-[calc(100%+0.5rem)] before:w-0.5 before:bg-subtle before:content-[''] first:before:rounded-t-full last:before:rounded-b-full",
        false: "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm",
      },
      hasChild: {
        true: "aria-[aria-current='page']:bg-transparent! relative after:absolute after:left-[-24px] after:top-6 after:h-[calc(100%-1.5rem)] after:w-0.5 after:bg-subtle after:content-[''] first:after:rounded-t-full last:after:rounded-b-full",
        false: "[&[aria-current='page']]:bg-subtle",
      },
      isFirstChild: {
        true: "mt-0",
        false: "mt-px",
      },
    },
    defaultVariants: {
      isChild: false,
      hasChild: false,
      isFirstChild: false,
    },
  }
);

const Label = ({ children }: { children: React.ReactNode }) => {
  return <span className="text-default ml-3">{children}</span>;
};

const NavigationItemComponent = ({
  item,
  isChild,
  index,
}: {
  item: NavigationItemType;
  isChild?: boolean;
  index?: number;
}) => {
  return (
    <Fragment>
      <ButtonOrLink
        data-test-id={item.name}
        href={item.href}
        className={navigationItemStyles({
          isChild,
          hasChild: !!item.child,
          isFirstChild: isChild && index === 0,
        })}
        aria-current={item.isCurrent ? "page" : undefined}
        onClick={item.onToggle}>
        {item.icon && (
          <Icon
            name={item.isLoading ? "rotate-cw" : item.icon}
            className={classNames(
              "text-subtle mr-2 h-4 w-4 shrink-0 rtl:ml-2 md:ltr:mx-auto lg:ltr:mr-2",
              item.isLoading && "animate-spin"
            )}
            aria-hidden="true"
            aria-current={item.isCurrent ? "page" : undefined}
          />
        )}
        <span className="text-emphasis hidden w-full justify-between truncate text-ellipsis lg:flex">
          {item.name}
          {item.badge && item.badge}
        </span>
      </ButtonOrLink>
      {item.child &&
        item.isExpanded &&
        item.child.map((childItem, childIndex) => (
          <NavigationItem key={childItem.name} item={childItem} isChild index={childIndex} />
        ))}
    </Fragment>
  );
};

export const NavigationItem = Object.assign(NavigationItemComponent, { Label });
