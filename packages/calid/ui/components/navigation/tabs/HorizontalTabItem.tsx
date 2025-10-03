import { cn } from "@calid/features/lib/cn";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";

import { Avatar } from "../../avatar";
import { Icon, type IconName } from "../../icon/Icon";

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
      className={cn(
        isCurrent
          ? "text-active dark:text-subtle border-active dark:border-emphasis border-b-2"
          : "text-subtle hover:border-emphasis hover:text-subtle border-b-2 border-transparent",
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
          className={cn("-ml-0.5 me-2 hidden h-4 w-4 text-inherit sm:inline-block")}
          aria-hidden="true"
        />
      )}
      {avatar && <Avatar size="xs" imageSrc={avatar} alt="avatar" className="-ml-0.5 me-2" />} {t(name)}
    </Link>
  );
};

export default HorizontalTabItem;
