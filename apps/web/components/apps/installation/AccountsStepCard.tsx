import type { FC } from "react";
import React, { useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { StepCard } from "@calcom/ui/components/card";

import type { TTeams } from "~/apps/installation/[[...step]]/step-view";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

type AccountStepCardProps = {
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
        "hover:bg-cal-muted flex cursor-pointer flex-row items-center gap-2 p-1",
        (alreadyInstalled || loading) && "cursor-not-allowed",
        selected && loading && "bg-cal-muted animate-pulse"
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
      <div className="text-md text-subtle pt-0.5 font-medium">
        {name}
        {alreadyInstalled ? <span className="text-subtle ml-2 text-sm">({t("already_installed")})</span> : ""}
      </div>
    </div>
  );
};

export const AccountsStepCard: FC<AccountStepCardProps> = ({
  teams,
  personalAccount,
  onSelect,
  loading,
  installableOnTeams,
}) => {
  const { t } = useLocale();
  return (
    <StepCard>
      <div className="text-subtle text-sm font-medium">{t("install_app_on")}</div>
      <div className={classNames("mt-2 flex flex-col gap-2 ")}>
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
    </StepCard>
  );
};
