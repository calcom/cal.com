import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Badge,
  Button,
  Label,
  SettingsToggle,
  Tooltip,
} from "@calcom/ui";
import { Info, X } from "@calcom/ui/components/icon";
import UpgradeTeamsBadge from "@calcom/features/upgrade-badges/UpgradeTeamsBadge";

import type { FormValues } from "../../../apps/web/pages/event-types/[type]";

type OptionalGuest = {
  id: number;
  name: string | null;
  email: string;
  avatar?: string | null;
  username?: string | null;
};

type Props = {
  /** The team ID for fetching team members */
  teamId: number;
  /** Whether the user/team has a team plan that enables this feature */
  isTeamPlan: boolean;
  /** The event type ID */
  eventTypeId: number;
};

/**
 * OptionalGuestSettings component
 * 
 * Allows adding team members as optional guests to an event type.
 * Optional guests:
 * - Are invited to all bookings of this event type
 * - Are NOT checked for availability conflicts
 * - Are marked as "optional" in calendar invites
 * 
 * Requirements:
 * - Only available for team event types (team members only)
 * - Shows UpgradeTeamsBadge for non-team plans
 */
export function OptionalGuestSettings({ teamId, isTeamPlan, eventTypeId }: Props) {
  const { t } = useLocale();
  const { watch, setValue } = useFormContext<FormValues>();

  const optionalGuests: OptionalGuest[] = watch("optionalGuests") ?? [];
  const [isEnabled, setIsEnabled] = useState(optionalGuests.length > 0);

  // Fetch team members - only runs if we have a teamId and team plan
  const { data: teamData, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      enabled: !!teamId && isTeamPlan,
    }
  );

  const teamMembers = teamData?.members ?? [];

  // Filter out already-added optional guests
  const availableMembers = teamMembers.filter(
    (member) => !optionalGuests.some((g) => g.id === member.id)
  );

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      // Clear optional guests when disabling
      setValue("optionalGuests", [], { shouldDirty: true });
    }
  };

  const handleAddMember = (memberId: number) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;

    setValue(
      "optionalGuests",
      [
        ...optionalGuests,
        {
          id: member.id,
          name: member.name,
          email: member.email,
          avatar: member.avatar,
          username: member.username,
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
          {/* Information notice about no conflict checking */}
          <div className="bg-muted flex items-start gap-2 rounded-md p-3">
            <Info className="text-default mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-default text-sm">
              {t("optional_guests_no_conflict_check")}
            </p>
          </div>

          {/* List of current optional guests */}
          {optionalGuests.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("optional_guests")}</Label>
              <ul className="space-y-2">
                {optionalGuests.map((guest) => (
                  <li
                    key={guest.id}
                    className="border-subtle bg-default flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        imageSrc={guest.avatar ?? undefined}
                        alt={guest.name ?? guest.email}
                        gravatarFallbackMd5={guest.email}
                      />
                      <div className="min-w-0">
                        <p className="text-default truncate text-sm font-medium">
                          {guest.name ?? guest.email}
                        </p>
                        {guest.name && (
                          <p className="text-subtle truncate text-xs">{guest.email}</p>
                        )}
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
                        className="ml-2 shrink-0"
                        onClick={() => handleRemoveMember(guest.id)}
                      />
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add more members */}
          {!isLoading && availableMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("add_team_member_as_optional_guest")}</Label>
              <ul className="space-y-1">
                {availableMembers.map((member) => (
                  <li
                    key={member.id}
                    className="border-subtle hover:bg-subtle flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors"
                    onClick={() => handleAddMember(member.id)}>
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        imageSrc={member.avatar ?? undefined}
                        alt={member.name ?? member.email}
                        gravatarFallbackMd5={member.email}
                      />
                      <div className="min-w-0">
                        <p className="text-default truncate text-sm font-medium">
                          {member.name ?? member.email}
                        </p>
                        {member.name && (
                          <p className="text-subtle truncate text-xs">{member.email}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="icon"
                      color="minimal"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddMember(member.id);
                      }}>
                      +
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoading && availableMembers.length === 0 && optionalGuests.length === 0 && (
            <p className="text-subtle text-sm">{t("no_team_members_available")}</p>
          )}

          {!isLoading && availableMembers.length === 0 && optionalGuests.length > 0 && (
            <p className="text-subtle text-sm">{t("all_members_added_as_optional")}</p>
          )}
        </div>
      )}
    </SettingsToggle>
  );
}

export default OptionalGuestSettings;
