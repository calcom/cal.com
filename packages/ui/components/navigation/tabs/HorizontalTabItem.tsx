import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUrlMatchesCurrentUrl } from "@calcom/lib/hooks/useUrlMatchesCurrentUrl";

import { Avatar } from "../../avatar";
import { Button } from "../../button";
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

  const isCurrent = useUrlMatchesCurrentUrl(href) || props?.isActive;

  return (
    <Button
      color={isCurrent ? "secondary" : "minimal"}
      className={classNames(
        props.icon ? "p-1.5" : "p-2",
        props.disabled && "pointer-events-none !opacity-30",
        props.className
      )}
      href={href}
      shallow={linkShallow}
      onClick={(e) => {
        if (props.onClick) {
          e.preventDefault();
          props.onClick(name);
        }
      }}
      key={name}
      target={props.target}
      data-testid={`horizontal-tab-${name}`}
      aria-current={isCurrent ? "page" : undefined}
      CustomStartIcon={props.icon && <Icon name={props.icon} className="text-subtle h-[14px] w-[14px]" />}>
      <div className="text-emphasis flex items-center gap-x-2 text-sm font-medium leading-none">
        {avatar && <Avatar size="sm" imageSrc={avatar} alt="avatar" />} {t(name)}
      </div>
    </Button>
  );
};

export default HorizontalTabItem;
