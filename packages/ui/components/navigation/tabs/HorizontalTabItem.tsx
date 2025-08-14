import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";
import classNames from "@calcom/ui/classNames";

import { Avatar } from "../../avatar";
import { Icon } from "../../icon";
import type { IconName } from "../../icon";

export type HorizontalTabItemProps = {
  name: string;
  disabled?: boolean;
  className?: string;
  target?: string;
  href: string;
  linkShallow?: boolean;
  linkScroll?: boolean;
  icon?: IconName;
  avatar?: string;
  onClick?: (name: string) => void;
  isActive?: boolean;
  "data-testid"?: string;
  matchFullPath?: boolean;
};

const HorizontalTabItem = function ({
  name,
  href,
  linkShallow,
  linkScroll,
  avatar,
  matchFullPath,
  ...props
}: HorizontalTabItemProps) {
  const isCurrent = useUrlMatchesCurrentUrl(href, matchFullPath) || props?.isActive;
  const { t } = useLocale();

  return (
    <Link
      onClick={(e) => {
        if (props.onClick) {
          e.preventDefault();
          props.onClick(name);
        }
      }}
      key={name}
      href={href}
      shallow={linkShallow}
      scroll={linkScroll}
      aria-disabled={props.disabled ? "true" : undefined}
      className={classNames(
        isCurrent
          ? "border-b-2 border-blue-500 text-blue-600"
          : "border-b-2 border-transparent text-gray-500 hover:border-gray-400 hover:text-gray-700",
        "inline-flex h-fit items-center justify-center whitespace-nowrap p-4 text-sm font-medium leading-none transition md:mb-0",
        props.disabled && "pointer-events-none !opacity-30",
        props.className
      )}
      target={props.target ? props.target : undefined}
      data-testid={`horizontal-tab-${props["data-testid"]}`}
      aria-current={isCurrent ? "page" : undefined}>
      {props.icon && (
        <Icon
          name={props.icon}
          className={classNames("-ml-0.5 me-2 hidden h-4 w-4 text-inherit sm:inline-block")}
          aria-hidden="true"
        />
      )}
      {avatar && <Avatar size="xs" imageSrc={avatar} alt="avatar" className="-ml-0.5 me-1" />} {t(name)}
    </Link>
  );
};

export default HorizontalTabItem;
