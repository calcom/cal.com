import type { TTeams } from "@pages/apps/installation/[[...step]]";
import type { FC } from "react";
import React from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { Button, StepCard } from "@calcom/ui";

import AccountSelector from "@components/apps/installation/AccountSelector";

export type PersonalAccountProps = Pick<User, "id" | "avatarUrl" | "name"> & { alreadyInstalled: boolean };

type TForm = {
  teams: TTeams;
};

type TeamStepCardProps = {
  teams?: TTeams;
  onSelect: (id?: number) => void;
  loading: boolean;
  installableOnTeams: boolean;
};

type TeamSelectorProps = {
  avatar?: string;
  name: string;
  handleSelect: () => void;
  loading: boolean;
  selected: boolean;
  id: number;
};

const TeamSelector: FC<TeamSelectorProps> = ({ avatar, name, selected, id, handleSelect }) => {
  return (
    <div
      data-testid={`select-team-${id}`}
      className="hover:bg-muted box-border flex w-full cursor-pointer select-none items-center space-x-4 px-4 py-2"
      onClick={() => handleSelect()}>
      <input
        id={`${id}`}
        checked={selected}
        className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        type="checkbox"
      />
      <label htmlFor={`${id}`} className="cursor-pointer text-sm">
        <AccountSelector
          avatar={avatar}
          name={name}
          alreadyInstalled={false}
          loading={false}
          testId="team-selector"
        />
      </label>
    </div>
  );
};
export const TeamSelectStepCard: FC<TeamStepCardProps> = ({
  teams,
  onSelect,
  loading,
  installableOnTeams,
}) => {
  const { t } = useLocale();

  const { control } = useForm<TForm>({
    defaultValues: {
      teams,
    },
  });

  const { fields, update } = useFieldArray({
    control,
    name: "teams",
    keyName: "fieldId",
  });

  return (
    <StepCard>
      <div className="text-sm font-medium text-gray-400">{t("install_app_on")}</div>
      <div className={classNames("mt-2 flex flex-col gap-2 ")}>
        {installableOnTeams &&
          fields.map((field, index) => (
            <TeamSelector
              key={field.fieldId}
              avatar={field.logoUrl ?? ""}
              name={field.name}
              selected={field.selected}
              handleSelect={() => update(index, { ...field, selected: !field.selected })}
              loading={loading}
              id={field.id}
            />
          ))}
      </div>

      <Button
        className="text-md mt-6 w-full justify-center"
        data-testid="save-event-types"
        onClick={() => {
          // setConfigureStep(true);
        }}
        disabled={!fields.some((field) => field.selected === true)}>
        {t("install")}
      </Button>
    </StepCard>
  );
};
