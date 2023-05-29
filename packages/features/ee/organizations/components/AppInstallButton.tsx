import { PlusIcon } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Badge } from "@calcom/ui";
import { Avatar, DropdownMenuItem } from "@calcom/ui";
import { DropdownMenuContent, DropdownMenuLabel, DropdownMenuPortal } from "@calcom/ui";
import { DropdownMenuTrigger } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Dropdown } from "@calcom/ui";

type AppInstallButtonProps = {
  onInstall: (userId: string, orgId?: string) => void;
  onUninstall: (userId: string, orgId?: string) => void;
  users: {
    id: string;
    orgId?: string; // present if org
    name: string;
    avatarUrl: string;
    installed?: boolean;
  }[];
} & ButtonProps;

export function AppInstallButton(props: AppInstallButtonProps) {
  const { t } = useLocale();
  const { users, onInstall, onUninstall } = props;

  if (users.length === 0) return null;

  if (users.length === 1) {
    if (!users[0].installed) {
      return (
        <Button
          onClick={() => onInstall(users[0].id, users[0].orgId)}
          color="secondary"
          size="sm"
          StartIcon={PlusIcon}>
          {t("install")}
        </Button>
      );
    } else {
      return (
        <Button
          onClick={() => onUninstall(users[0].id, users[0].orgId)}
          color="secondary"
          size="sm"
          StartIcon={PlusIcon}>
          {t("uninstall")}
        </Button>
      );
    }
  }

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button color="secondary" size="sm" StartIcon={PlusIcon}>
          {t("install")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent className="min-w-64">
          <DropdownMenuLabel>{t("install_app_on")}</DropdownMenuLabel>
          {users.map((user) => {
            return (
              <DropdownMenuItem
                key={user.id}
                className="flex h-9 flex-1 items-center space-x-2 pl-3"
                onSelect={() => {
                  user.installed ? onUninstall(user.id, user.orgId) : onInstall(user.id, user.orgId);
                }}>
                <div className="h-5 w-5">
                  <Avatar
                    className="h-5 w-5"
                    size="sm"
                    alt={user.name}
                    imageSrc={user.avatarUrl}
                    gravatarFallbackMd5="hash"
                    asChild
                  />
                </div>
                <div className="mr-auto text-sm font-medium leading-none">{user.name}</div>
                {user.installed && (
                  <Badge size="sm" className="ml-auto">
                    {t("installed")}{" "}
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
}
