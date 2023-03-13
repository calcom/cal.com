import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";

import classNames from "@calcom/lib/classNames";

export type ListProps = {
  roundContainer?: boolean;
} & JSX.IntrinsicElements["ul"];

export function List(props: ListProps) {
  return (
    <ul
      {...props}
      className={classNames(
        "divide-y divide-gray-200 rounded-sm rounded-md border border-l border-r sm:mx-0",
        // Add rounded top and bottome if roundContainer is true
        props.roundContainer && "[&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md ",
        props.className
      )}>
      {props.children}
    </ul>
  );
}

export type ListItemProps = {
  href?: string;
  heading: string;
  subHeading?: ReactNode;
  leftNode?: ReactNode;
  badgePosition?: "heading" | "subheading" | "below";
  badges?: ReactNode;
  removeHover?: boolean;
  disabled?: boolean;
  actions?: ReactNode;
  expanded?: ReactNode;
  belowHeading?: ReactNode;
} & Omit<JSX.IntrinsicElements["li"], "children">;

export function ListItem(props: ListItemProps) {
  const [animatedRef] = useAutoAnimate<HTMLDivElement>();
  const {
    href,
    heading,
    subHeading,
    expanded,
    removeHover = false,
    actions,
    leftNode,
    disabled,
    ...rest
  } = props;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    if (!href) return <div className="text-sm"> {children} </div>;

    return (
      <Link
        passHref
        href={href}
        className={classNames(
          "text-sm",
          disabled ? "pointer-events-none cursor-not-allowed opacity-30" : ""
        )}>
        {children}
      </Link>
    );
  };

  return (
    <li className={classNames("group px-4 py-5 ", !removeHover && "hover:bg-neutral-50")} {...rest}>
      <>
        <Wrapper>
          <div className="flex [&>*]:mr-3">
            {leftNode ? <div className="max-w-9 max-h-9">{leftNode} </div> : null}
            <div className="flex flex-col">
              <BadgeHandler
                as="h3"
                className="h-5 text-sm font-semibold leading-none text-black"
                componentPosition="heading"
                badges={props.badges}
                badgePosition={props.badgePosition}>
                {heading}
              </BadgeHandler>
              {subHeading && (
                <BadgeHandler
                  as="h4"
                  className="text-sm font-normal leading-normal text-gray-600"
                  componentPosition="subheading"
                  badges={props.badges}
                  badgePosition={props.badgePosition}>
                  <div className="line-clamp-1">{subHeading}</div>
                </BadgeHandler>
              )}
              <BadgeHandler
                componentPosition="below"
                badges={props.badges}
                badgePosition={props.badgePosition}
              />
              {props.belowHeading ? props.belowHeading : null}
            </div>
            {actions ? <div className="ml-auto">{actions}</div> : null}
          </div>
        </Wrapper>
        {expanded ? (
          <>
            <div className="my-4 -mx-4 h-px bg-gray-200" />
            <div className="-m-4" ref={animatedRef}>
              {expanded}
            </div>
          </>
        ) : null}
      </>
    </li>
  );
}

type BadgeHandlerProps = {
  badgePosition?: "heading" | "subheading" | "below";
  badges?: ReactNode;
  componentPosition?: "heading" | "subheading" | "below";
  as?: React.ElementType;
  className?: string;
};

function BadgeHandler(props: PropsWithChildren<BadgeHandlerProps>) {
  const Component = props.as || "div";

  if (props.badgePosition === props.componentPosition) {
    return (
      <div className="item-center flex">
        <Component className={classNames(props.className, "inline-flex items-center")}>
          {props.children}
        </Component>
        <div
          className={classNames("flex", props.badgePosition === "below" ? "[&>*]:mr-2" : "ml-1 space-x-2")}>
          {props.badges}
        </div>
      </div>
    );
  }

  return <Component className={props.className}>{props.children}</Component>;
}
