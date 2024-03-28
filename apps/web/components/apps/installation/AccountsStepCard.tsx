import type { FC } from "react";
import React from "react";

import { classNames } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import type { Team, User } from "@calcom/prisma/client";
import { Avatar, StepCard } from "@calcom/ui";

type AccountSelectorProps = {
  avatar?: string;
  name: string;
  alreadyInstalled: boolean;
  onClick?: () => void;
};

const AccountSelector: FC<AccountSelectorProps> = ({ avatar, alreadyInstalled, name, onClick }) => (
  <div
    className={classNames(
      "hover:bg-muted flex cursor-pointer flex-row items-center gap-2 p-1",
      alreadyInstalled && "cursor-not-allowed"
    )}
    onClick={onClick}>
    <Avatar
      alt={avatar || ""}
      imageSrc={avatar || `${CAL_URL}/${avatar}`} // if no image, use default avatar
      size="sm"
    />
    <div className="text-md pt-0.5 font-medium text-gray-500">
      {name}
      {alreadyInstalled ? <span className="ml-1 text-sm text-gray-400">(already installed)</span> : ""}
    </div>
  </div>
);

export type PersonalAccountProps = Pick<User, "id" | "avatar" | "name"> & { alreadyInstalled: boolean };

export type TeamsProp = (Pick<Team, "id" | "name" | "logo"> & {
  alreadyInstalled: boolean;
})[];

type onSelectPersonalAccParams = { type: "personal"; id?: undefined };
type onSelectPersonalTeamParams = { type: "team"; id: number };
export type onSelectParams = onSelectPersonalAccParams | onSelectPersonalTeamParams;

export type onSelectProp = (params: onSelectParams) => void;

type AccountStepCardProps = {
  teams: TeamsProp;
  personalAccount: PersonalAccountProps;
  onSelect: onSelectProp;
  loading: boolean;
};

export const AccountsStepCard: FC<AccountStepCardProps> = ({ teams, personalAccount, onSelect, loading }) => {
  return (
    <StepCard>
      <div className="text-sm font-medium text-gray-400">Install app on</div>
      <div
        className={classNames(
          "mt-2 flex flex-col gap-2 ",
          loading && "bg-muted pointer-events-none animate-pulse"
        )}>
        <AccountSelector
          avatar={personalAccount.avatar ?? ""}
          name={personalAccount.name ?? ""}
          alreadyInstalled={personalAccount.alreadyInstalled}
          onClick={() => !personalAccount.alreadyInstalled && onSelect({ type: "personal" })}
        />
        {teams.map((team) => (
          <AccountSelector
            key={team.id}
            alreadyInstalled={team.alreadyInstalled}
            avatar={team.logo ?? ""}
            name={team.name}
            onClick={() => !team.alreadyInstalled && onSelect({ type: "team", id: team.id })}
          />
        ))}
      </div>
    </StepCard>
  );
};
