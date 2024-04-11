import type { FC } from "react";
import React, { useState } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Team, User } from "@calcom/prisma/client";
import { Avatar, StepCard } from "@calcom/ui";

type AccountSelectorProps = {
  avatarUrl?: string;
  name: string;
  alreadyInstalled: boolean;
  onClick?: () => void;
  loading: boolean;
  testId: string;
};

const AccountSelector: FC<AccountSelectorProps> = ({
  avatarUrl,
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
        selected && "bg-muted animate-pulse"
      )}
      data-testid={testId}
      onClick={() => {
        if (onClick) {
          setSelected(true);
          onClick();
        }
      }}>
      <Avatar
        alt={avatarUrl || ""}
        imageSrc={avatarUrl} // if no image, use default avatar
        size="sm"
      />
      <div className="text-md pt-0.5 font-medium text-gray-500">
        {name}
        {alreadyInstalled ? <span className="ml-1 text-sm text-gray-400">{t("already_installed")}</span> : ""}
      </div>
    </div>
  );
};

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

export type TeamsProp = (Pick<Team, "id" | "name" | "logoUrl"> & {
  alreadyInstalled: boolean;
})[];

type AccountStepCardProps = {
  teams: TeamsProp;
  personalAccount: PersonalAccountProps;
  onSelect: (id?: number) => void;
  loading: boolean;
};

export const AccountsStepCard: FC<AccountStepCardProps> = ({ teams, personalAccount, onSelect, loading }) => {
  const { t } = useLocale();
  return (
    <StepCard>
      <div className="text-sm font-medium text-gray-400">{t("install_app_on")}</div>
      <div className={classNames("mt-2 flex flex-col gap-2 ")}>
        <AccountSelector
          testId="install-app-on-personal-account"
          avatarUrl={personalAccount.avatarUrl ?? ""}
          name={personalAccount.name ?? ""}
          alreadyInstalled={personalAccount.alreadyInstalled}
          onClick={() => !personalAccount.alreadyInstalled && !loading && onSelect()}
          loading={loading}
        />
        {teams.map((team) => (
          <AccountSelector
            key={team.id}
            testId={`install-app-on-team-${team.id}`}
            alreadyInstalled={team.alreadyInstalled}
            avatarUrl={team.logoUrl ?? ""}
            name={team.name}
            onClick={() => !team.alreadyInstalled && !loading && onSelect(team.id)}
            loading={loading}
          />
        ))}
      </div>
    </StepCard>
  );
};
