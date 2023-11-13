import Link from "next/link";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";
import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Avatar } from "../../avatar";
import { SkeletonText } from "../../skeleton";

export type HorizontalTabItemProps = {
  name: string;
  disabled?: boolean;
  className?: string;
  href: string;
  linkShallow?: boolean;
  linkScroll?: boolean;
  icon?: SVGComponent;
  avatar?: string;
};

const HorizontalTabItem = function ({
  name,
  href,
  linkShallow,
  linkScroll,
  avatar,
  ...props
}: HorizontalTabItemProps) {
  const { t, isLocaleReady } = useLocale();

  const isCurrent = useUrlMatchesCurrentUrl(href);

  return (
    <Link
      key={name}
      href={href}
      shallow={linkShallow}
      scroll={linkScroll}
      className={classNames(
        isCurrent ? "bg-emphasis text-emphasis" : "hover:bg-subtle hover:text-emphasis text-default",
        "inline-flex items-center justify-center whitespace-nowrap rounded-[6px] p-2 text-sm font-medium leading-4 transition md:mb-0",
        props.disabled && "pointer-events-none !opacity-30",
        props.className
      )}
      data-testid={`horizontal-tab-${name}`}
      aria-current={isCurrent ? "page" : undefined}>
      {props.icon && (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        <props.icon
          className={classNames(
            isCurrent ? "text-emphasis" : "group-hover:text-subtle text-muted",
            "-ml-0.5 hidden h-4 w-4 ltr:mr-2 rtl:ml-2 sm:inline-block"
          )}
          aria-hidden="true"
        />
      )}
      {isLocaleReady ? (
        <div className="flex items-center gap-x-2">
          {avatar && <Avatar size="sm" imageSrc={avatar} alt="avatar" />} {t(name)}
        </div>
      ) : (
        <SkeletonText className="h-4 w-24" />
      )}
    </Link>
  );
};

export default HorizontalTabItem;
