import { StepCard } from "@calid/features/ui/components/card/stepcard";
import type { FC } from "react";
import React, { useState } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";

import type { TTeams } from "~/apps/installation/[[...step]]/step-view";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & {
  alreadyInstalled: boolean;
  allowedMultipleInstalls?: boolean;
};

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
  allowedMultipleInstalls?: boolean;
  onClick?: () => void;
  loading: boolean;
  testId: string;
};

const AccountSelector: FC<AccountSelectorProps> = ({
  avatar,
  alreadyInstalled,
  allowedMultipleInstalls,
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
        "hover:bg-muted flex cursor-pointer flex-row items-center gap-2 rounded-md p-1",
        ((alreadyInstalled && !allowedMultipleInstalls) || loading) && "cursor-not-allowed",
        selected && loading && "bg-muted animate-pulse"
      )}
      data-testid={testId}
      onClick={() => {
        if ((!alreadyInstalled || allowedMultipleInstalls) && !loading && onClick) {
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
        {alreadyInstalled && !allowedMultipleInstalls ? (
          <span className="text-subtle ml-2 text-sm">({t("already_installed")})</span>
        ) : (
          ""
        )}
        {alreadyInstalled && allowedMultipleInstalls ? (
          <span className="text-subtle ml-2 text-sm">
            ({t("already_installed")}. {t("click_to_install_more")})
          </span>
        ) : (
          ""
        )}
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
          allowedMultipleInstalls={personalAccount.allowedMultipleInstalls}
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
              allowedMultipleInstalls={team.allowedMultipleInstalls}
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
