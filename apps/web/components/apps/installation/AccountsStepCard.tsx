import type { TTeams } from "@pages/apps/installation/[[...step]]";
import type { FC } from "react";
import React from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { StepCard } from "@calcom/ui";

import AccountSelector from "@components/apps/installation/AccountSelector";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

type AccountStepCardProps = {
  teams?: TTeams;
  personalAccount: PersonalAccountProps;
  onSelect: (id?: number) => void;
  loading: boolean;
  installableOnTeams: boolean;
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
      <div className="text-sm font-medium text-gray-400">{t("install_app_on")}</div>
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
