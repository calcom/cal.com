import { PlusIcon } from "lucide-react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui";
import { Avatar, DropdownMenuItem } from "@calcom/ui";
import { DropdownMenuContent, DropdownMenuLabel, DropdownMenuPortal } from "@calcom/ui";
import { DropdownMenuTrigger } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { Dropdown } from "@calcom/ui";

type AppInstallButtonProps = {
  onInstall: (userId: string) => void;
  onUninstall: (userId: string) => void;
  isInstalled: boolean;
  users: {
    id: string;
    orgId?: string; // present if org
    name: string;
    avatarUrl: string;
  }[];
} & ButtonProps;

export function AppInstallButton(props: AppInstallButtonProps) {
  const { t } = useLocale();
  const { users, onInstall, onUninstall } = props;

  if (users.length === 0) return null;

  if (users.length === 1) {
    if (props.isInstalled) {
      return (
        <Button onClick={() => onInstall(users[0].id)} color="secondary" size="sm" StartIcon={PlusIcon}>
          {t("install")}
        </Button>
      );
    } else {
      return (
        <Button onClick={() => onUninstall(users[0].id)} color="secondary" size="sm" StartIcon={PlusIcon}>
          {t("uninstall")}
        </Button>
      );
    }
  }

  return (
    <Dropdown>
      <DropdownMenuTrigger>
        <Button color="secondary" size="sm" StartIcon={PlusIcon}>
          {t("install")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuLabel>{t("install_app_on")}</DropdownMenuLabel>
          {users.map((user) => {
            return (
              <DropdownMenuItem
                key={user.id}
                onSelect={() => {
                  onInstall(user.id);
                }}>
                <div className="h-4 w-4">
                  <Avatar size="sm" alt={user.name} imageSrc={user.avatarUrl} />
                </div>
                <div className="text-sm font-medium leading-5">{user.name}</div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
}
