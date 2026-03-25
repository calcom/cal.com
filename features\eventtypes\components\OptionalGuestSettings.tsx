import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "next-i18next";

import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Badge,
  Button,
  Label,
  Select,
  SettingsToggle,
  Tooltip,
} from "@calcom/ui";
import { X, Info } from "@calcom/ui/components/icon";

import { UpgradeTeamsBadge } from "@calcom/ui";

type TeamMember = {
  id: number;
  name: string | null;
  email: string;
  avatar: string | null;
  username: string | null;
};

type Props = {
  teamId?: number | null;
  /** Whether the user has a team plan */
  isTeamPlan: boolean;
  /** Current event type ID */
  eventTypeId: number;
};

export function OptionalGuestSettings({ teamId, isTeamPlan, eventTypeId }: Props) {
  const { t } = useTranslation("common");
  const { watch, setValue } = useFormContext();
  
  const optionalGuests: TeamMember[] = watch("optionalGuests") ?? [];
  const [isEnabled, setIsEnabled] = useState(optionalGuests.length > 0);

  // Fetch team members if teamId is provided
  const { data: teamMembers, isLoading } = trpc.viewer.teams.listMembers.useQuery(
    { teamId: teamId ?? 0 },
    { enabled: !!teamId && isTeamPlan }
  );

  const availableMembers = (teamMembers?.members ?? []).filter(
    (member) => !optionalGuests.some((g) => g.id === member.id)
  );

  const memberOptions = availableMembers.map((member) => ({
    label: member.name ?? member.email,
    value: String(member.id),
    member,
  }));

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setValue("optionalGuests", [], { shouldDirty: true });
    }
  };

  const handleAddMember = (option: { value: string; member: typeof teamMembers extends { members: infer M[] } ? M : never } | null) => {
    if (!option) return;
    const member = teamMembers?.members.find((m) => String(m.id) === option.value);
    if (!member) return;
    
    setValue(
      "optionalGuests",
      [
        ...optionalGuests,
        {
          id: member.id,
          name: member.name,
          email: member.email,
          avatar: member.avatarUrl ?? null,
          username: member.username ?? null,
        },
      ],
      { shouldDirty: true }
    );
  };

  const handleRemoveMember = (memberId: number) => {
    setValue(
      "optionalGuests",
      optionalGuests.filter((g) => g.id !== memberId),
      { shouldDirty: true }
    );
  };

  return (
    <SettingsToggle
      labelClassName="text-sm"
      toggleSwitchAtTheEnd={true}
      switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
      title={t("add_optional_team_members")}
      description={t("add_optional_team_members_description")}
      checked={isEnabled}
      onCheckedChange={handleToggle}
      disabled={!isTeamPlan}
      Badge={!isTeamPlan ? <UpgradeTeamsBadge /> : undefined}>
      {isEnabled && isTeamPlan && (
        <div className="mt-4 space-y-4">
          {/* Info notice */}
          <div className="bg-subtle flex items-start gap-2 rounded-md p-3">
            <Info className="text-subtle mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-subtle text-sm">
              {t("optional_guests_no_conflict_check")}
            </p>
          </div>

          {/* Member selector */}
          {!isLoading && memberOptions.length > 0 && (
            <div>
              <Label>{t("add_team_member")}</Label>
              <Select
                placeholder={t("select_team_member")}
                options={memberOptions}
                onChange={handleAddMember}
                value={null}
                formatOptionLabel={(option) => (
                  <div className="flex items-center gap-2">
                    <Avatar
                      size="xs"
                      imageSrc={option.member.avatarUrl}
                      alt={option.member.name ?? option.member.email}
                    />
                    <span>{option.member.name ?? option.member.email}</span>
                    <span className="text-subtle text-xs">{option.member.email}</span>
                  </div>
                )}
              />
            </div>
          )}

          {/* Selected optional guests */}
          {optionalGuests.length > 0 && (
            <div className="space-y-2">
              <Label>{t("optional_guests")}</Label>
              <ul className="space-y-2">
                {optionalGuests.map((guest) => (
                  <li
                    key={guest.id}
                    className="border-subtle flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        size="sm"
                        imageSrc={guest.avatar ?? undefined}
                        alt={guest.name ?? guest.email}
                      />
                      <div>
                        <p className="text-sm font-medium">{guest.name ?? guest.email}</p>
                        <p className="text-subtle text-xs">{guest.email}</p>
                      </div>
                      <Badge variant="gray" size="sm">
                        {t("optional")}
                      </Badge>
                    </div>
                    <Tooltip content={t("remove")}>
                      <Button
                        variant="icon"
                        color="minimal"
                        StartIcon={X}
                        onClick={() => handleRemoveMember(guest.id)}
                      />
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoading && memberOptions.length === 0 && optionalGuests.length === 0 && (
            <p className="text-subtle text-sm">{t("no_team_members_available")}</p>
          )}
        </div>
      )}
    </SettingsToggle>
  );
}
