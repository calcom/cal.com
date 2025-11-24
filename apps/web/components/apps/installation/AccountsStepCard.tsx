import type { FC } from "react";
import React, { useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";

import type { TTeams } from "~/apps/installation/[[...step]]/step-view";
import { InstallationCard } from "~/apps/installation/components/InstallationCard";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

type AccountStepCardProps = {
  title: string;
  subtitle: string;
  teams?: TTeams;
  personalAccount: PersonalAccountProps;
  onSelect: (id?: number) => void;
  loading: boolean;
  installableOnTeams: boolean;
};

type AccountSelectorProps = {
  avatar?: string;
  name: string;
  alreadyInstalled: boolean;
  onClick?: () => void;
  loading: boolean;
  testId: string;
};

const AccountSelector: FC<AccountSelectorProps> = ({
  avatar,
  alreadyInstalled,
  name,
  onClick,
  loading,
  testId,
}) => {
  const { t } = useLocale();
  const [selected, setSelected] = useState(false);
  return (
    <div
      className={classNames(
        "hover:bg-muted flex cursor-pointer flex-row items-center gap-2 p-1",
        (alreadyInstalled || loading) && "cursor-not-allowed",
        selected && loading && "bg-muted animate-pulse"
      )}
      data-testid={testId}
      onClick={() => {
        if (!alreadyInstalled && !loading && onClick) {
          setSelected(true);
          onClick();
        }
      }}>
      <Avatar
        alt={avatar || ""}
        imageSrc={getPlaceholderAvatar(avatar, name)} // if no image, use default avatar
        size="sm"
      />
      <div className="text-md text-subtle min-w-0 flex-1 pt-0.5 font-medium">
        <span className="truncate">{name}</span>
        {alreadyInstalled ? (
          <span className="text-subtle ml-2 whitespace-nowrap text-sm">({t("already_installed")})</span>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export const AccountsStepCard: FC<AccountStepCardProps> = ({
  title,
  subtitle,
  teams,
  personalAccount,
  onSelect,
  loading,
  installableOnTeams,
}) => {
  const { t } = useLocale();
  return (
    <InstallationCard title={title} subtitle={subtitle} useFitHeight={true}>
      <div className="text-subtle w-full min-w-0 text-sm font-medium">{t("install_app_on")}</div>
      <div className={classNames("mt-2 flex w-full min-w-0 flex-col gap-2")}>
        <AccountSelector
          testId="install-app-button-personal"
          avatar={personalAccount.avatarUrl ?? ""}
          name={personalAccount.name ?? ""}
          alreadyInstalled={personalAccount.alreadyInstalled}
          onClick={() => onSelect()}
          loading={loading}
        />
        {installableOnTeams &&
          teams?.map((team) => (
            <AccountSelector
              key={team.id}
              testId={`install-app-button-team${team.id}`}
              alreadyInstalled={team.alreadyInstalled}
              avatar={team.logoUrl ?? ""}
              name={team.name}
              onClick={() => onSelect(team.id)}
              loading={loading}
            />
          ))}
      </div>
    </InstallationCard>
  );
};
