import Link from "next/link";
import { Fragment } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";
import type { SVGComponent } from "@calcom/types/SVGComponent";

import { ChevronRight, ExternalLink } from "../../icon";
import { Skeleton } from "../../skeleton";

export type VerticalTabItemProps = {
  name: string;
  info?: string;
  icon?: SVGComponent;
  disabled?: boolean;
  children?: VerticalTabItemProps[];
  textClassNames?: string;
  className?: string;
  isChild?: boolean;
  hidden?: boolean;
  disableChevron?: boolean;
  href: string;
  isExternalLink?: boolean;
  linkShallow?: boolean;
  linkScroll?: boolean;
  avatar?: string;
  iconClassName?: string;
};

const VerticalTabItem = ({
  name,
  href,
  info,
  isChild,
  disableChevron,
  linkShallow,
  linkScroll,
  ...props
}: VerticalTabItemProps) => {
  const { t } = useLocale();
  const isCurrent = useUrlMatchesCurrentUrl(href);

  return (
    <Fragment key={name}>
      {!props.hidden && (
        <>
          <Link
            key={name}
            href={href}
            shallow={linkShallow}
            scroll={linkScroll}
            target={props.isExternalLink ? "_blank" : "_self"}
            className={classNames(
              props.textClassNames || "text-default text-sm font-medium leading-none",
              "min-h-8 hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default group flex w-64 flex-row items-center rounded-md px-3 py-[10px] transition",
              props.disabled && "pointer-events-none !opacity-30",
              (isChild || !props.icon) && "ml-7 w-auto ltr:mr-5 rtl:ml-5",
              !info ? "h-6" : "h-14",
              props.className
            )}
            data-testid={`vertical-tab-${name}`}
            aria-current={isCurrent ? "page" : undefined}>
            {props.icon && (
              <props.icon
                className={classNames(
                  "mr-2 h-[16px] w-[16px] stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0",
                  props.iconClassName
                )}
                data-testid="icon-component"
              />
            )}
            <div className="h-fit">
              <span className="flex items-center space-x-2 rtl:space-x-reverse">
                <Skeleton title={t(name)} as="p" className="max-w-36 min-h-4 mt-px truncate">
                  {t(name)}
                </Skeleton>
                {props.isExternalLink ? <ExternalLink data-testid="external-link" /> : null}
              </span>
              {info && (
                <Skeleton as="p" title={t(info)} className="max-w-44 mt-1 truncate text-xs font-normal">
                  {t(info)}
                </Skeleton>
              )}
            </div>
            {!disableChevron && isCurrent && (
              <div className="ml-auto self-center">
                <ChevronRight
                  width={20}
                  height={20}
                  className="text-default h-auto w-[20px] stroke-[1.5px]"
                  data-testid="chevron-right"
                />
              </div>
            )}
          </Link>
          {props.children?.map((child) => (
            <VerticalTabItem key={child.name} {...child} isChild />
          ))}
        </>
      )}
    </Fragment>
  );
};

export default VerticalTabItem;
