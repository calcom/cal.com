"use client";

import type { AppListCardProps } from "@calcom/features/apps/components/AppListCard";
import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Badge, Icon, ListItemText } from "@calcom/ui";

export const AppListCard = (props: AppListCardProps & { highlight?: boolean }) => {
  const { t } = useLocale();
  const {
    logo,
    title,
    description,
    actions,
    isDefault,
    isTemplate,
    invalidCredential,
    children,
    credentialOwner,
    className,
    highlight,
  } = props;

  return (
    <div className={classNames(highlight && "dark:bg-muted bg-yellow-100", className)}>
      <div className="flex items-center gap-x-3 px-4 py-4 sm:px-6">
        {logo ? (
          <img
            className={classNames(logo.includes("-dark") && "dark:invert", "h-10 w-10")}
            src={logo}
            alt={`${title} logo`}
          />
        ) : null}
        <div className="flex grow flex-col gap-y-1 truncate">
          <div className="flex items-center gap-x-2">
            <h3 className="text-emphasis truncate text-sm font-semibold">{title}</h3>
            <div className="flex items-center gap-x-2">
              {isDefault && <Badge variant="green">{t("default")}</Badge>}
              {isTemplate && <Badge variant="red">Template</Badge>}
            </div>
          </div>
          <ListItemText component="p">{description}</ListItemText>
          {invalidCredential && (
            <div className="flex gap-x-2 pt-2">
              <Icon name="circle-alert" className="h-8 w-8 text-red-500 sm:h-4 sm:w-4" />
              <ListItemText component="p" className="whitespace-pre-wrap text-red-500">
                {t("invalid_credential")}
              </ListItemText>
            </div>
          )}
        </div>
        {credentialOwner && (
          <div>
            <Badge variant="gray">
              <div className="flex items-center">
                <Avatar
                  className="mr-2"
                  alt={credentialOwner.name || "Nameless"}
                  size="xs"
                  imageSrc={getPlaceholderAvatar(credentialOwner.avatar, credentialOwner?.name as string)}
                />
                {credentialOwner.name}
              </div>
            </Badge>
          </div>
        )}
        {actions}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};
