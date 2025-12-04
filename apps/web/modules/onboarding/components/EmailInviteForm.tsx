"use client";

import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { InviteRole } from "../store/onboarding-store";

type BaseInviteFormData = {
  email: string;
  role: InviteRole;
};

type InviteFormDataWithOptionalTeam = BaseInviteFormData & {
  team?: string;
};

type InviteFormDataWithRequiredTeam = BaseInviteFormData & {
  team: string;
};

type InviteFormData = InviteFormDataWithOptionalTeam | InviteFormDataWithRequiredTeam;

type EmailInviteFormProps = {
  fields: Array<{ id: string }>;
  append: (value: InviteFormData) => void;
  remove: (index: number) => void;
  defaultRole: InviteRole;
  showTeamSelect?: boolean;
  teams?: Array<{ value: string; label: string }>;
  emailPlaceholder?: string;
};

export function EmailInviteForm({
  fields,
  append,
  remove,
  defaultRole,
  showTeamSelect = false,
  teams = [],
  emailPlaceholder,
}: EmailInviteFormProps) {
  const { t } = useLocale();
  const { register, watch, setValue } = useFormContext();

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        {showTeamSelect ? (
          <div className="mr-7 grid grid-cols-2">
            <Label className="text-emphasis mb-0 text-sm font-medium" htmlFor="invites.0.email">
              {t("email")}
            </Label>
            <Label className="text-emphasis mb-0 text-sm font-medium" htmlFor="invites.0.team">
              {t("team")}
            </Label>
          </div>
        ) : (
          <Label className="text-emphasis mb-0 text-sm font-medium">{t("email")}</Label>
        )}

        <div
          className={
            showTeamSelect ? "flex flex-col gap-2" : "scroll-bar flex max-h-72 flex-col gap-2 overflow-y-auto"
          }>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className={showTeamSelect ? "grid flex-1 items-start gap-2 md:grid-cols-2" : "flex-1"}>
                <TextField
                  labelSrOnly
                  {...register(`invites.${index}.email`)}
                  placeholder={emailPlaceholder || `rick@cal.com`}
                  type="email"
                  size="sm"
                />
                {showTeamSelect && (
                  <Select
                    size="sm"
                    options={teams}
                    value={teams.find((t) => t.value === watch(`invites.${index}.team`))}
                    onChange={(option) => {
                      if (option) {
                        setValue(`invites.${index}.team`, option.value);
                      }
                    }}
                    placeholder={t("select_team")}
                  />
                )}
              </div>
              <Button
                type="button"
                color="minimal"
                variant="icon"
                size="sm"
                className="h-7 w-7"
                disabled={fields.length === 1}
                onClick={() => remove(index)}>
                <Icon name="x" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          color="secondary"
          size="sm"
          StartIcon="plus"
          className={showTeamSelect ? "mt-2 w-fit" : "w-fit"}
          onClick={() =>
            append(
              showTeamSelect ? { email: "", team: "", role: defaultRole } : { email: "", role: defaultRole }
            )
          }>
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
