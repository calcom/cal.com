import noop from "lodash/noop";
import Link from "next/link";
import { useRouter } from "next/router";
import { FC, Fragment, MouseEventHandler } from "react";

// import { ChevronRight } from "react-feather";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SVGComponent } from "@calcom/types/SVGComponent";
import { Icon } from "@calcom/ui/Icon";

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
} & (
  | {
      /** If you want to change query param tabName as per current tab */
      href: string;
      tabName?: never;
    }
  | {
      href?: never;
      /** If you want to change the path as per current tab */
      tabName: string;
    }
);

const VerticalTabItem: FC<VerticalTabItemProps> = ({
  name,
  href,
  tabName,
  info,
  isChild,
  disableChevron,
  ...props
}) => {
  const router = useRouter();
  const { t } = useLocale();
  let newHref = "";
  let isCurrent;
  if (href) {
    newHref = href;
    isCurrent = router.asPath === href;
  } else if (tabName) {
    newHref = "";
    isCurrent = router.query.tabName === tabName;
  }

  const onClick: MouseEventHandler = tabName
    ? (e) => {
        e.preventDefault();
        router.push({
          query: {
            ...router.query,
            tabName,
          },
        });
      }
    : noop;

  return (
    <Fragment key={name}>
      {!props.hidden && (
        <>
          <Link key={name} href={props.disabled ? "#" : newHref}>
            <a
              onClick={onClick}
              className={classNames(
                props.textClassNames || "text-sm font-medium leading-none text-gray-600",
                "group flex w-64 flex-row items-center rounded-md px-3 py-[10px] hover:bg-gray-100 group-hover:text-gray-700  [&[aria-current='page']]:bg-gray-200 [&[aria-current='page']]:text-gray-900",
                props.disabled && "pointer-events-none !opacity-30",
                (isChild || !props.icon) && "ml-7 mr-5 w-auto",
                !info ? "h-9" : "h-14",
                props.className
              )}
              aria-current={isCurrent ? "page" : undefined}>
              {props.icon && (
                <props.icon className="mr-[10px] h-[16px] w-[16px] self-start stroke-[2px] md:mt-0" />
              )}
              <div>
                <p>{t(name)}</p>
                {info && <p className="pt-1 text-xs font-normal">{t(info)}</p>}
              </div>
              {!disableChevron && isCurrent && (
                <div className="ml-auto self-center">
                  <Icon.FiChevronRight
                    width={20}
                    height={20}
                    className="h-auto w-[20px] stroke-[1.5px] text-gray-700"
                  />
                </div>
              )}
            </a>
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
