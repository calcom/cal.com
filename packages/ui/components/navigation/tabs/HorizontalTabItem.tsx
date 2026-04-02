import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";
import classNames from "@calcom/ui/classNames";
import Link from "next/link";
import { Avatar } from "../../avatar";
import type { IconName } from "../../icon";
import { Icon } from "../../icon";

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

const HorizontalTabItem = ({
  name,
  href,
  linkShallow,
  linkScroll,
  avatar,
  matchFullPath,
  ...props
}: HorizontalTabItemProps) => {
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
        isCurrent ? "bg-subtle text-emphasis" : "hover:bg-cal-muted hover:text-default text-subtle",
        "inline-flex h-fit items-center justify-center whitespace-nowrap rounded-md p-2 text-sm font-medium leading-none transition md:mb-0",
        props.disabled && "pointer-events-none opacity-30!",
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
