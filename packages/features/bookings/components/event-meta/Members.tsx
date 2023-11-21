import { SchedulingType } from "@calcom/prisma/enums";
import { UserAvatarGroup } from "@calcom/web/components/ui/avatar/UserAvatarGroup";
import { UserAvatarGroupWithOrg } from "@calcom/web/components/ui/avatar/UserAvatarGroupWithOrg";

import type { PublicEvent } from "../../types";

export interface EventMembersProps {
  /**
   * Used to determine whether all members should be shown or not.
   * In case of Round Robin type, members aren't shown.
   */
  schedulingType: PublicEvent["schedulingType"];
  users: PublicEvent["users"];
  profile: PublicEvent["profile"];
  entity: PublicEvent["entity"];
}

export const EventMembers = ({ schedulingType, users, profile, entity }: EventMembersProps) => {
  const showMembers = schedulingType !== SchedulingType.ROUND_ROBIN;
  const shownUsers = showMembers ? users : [];

  // In some cases we don't show the user's names, but only show the profile name.
  const showOnlyProfileName =
    (profile.name && schedulingType === SchedulingType.ROUND_ROBIN) ||
    !users.length ||
    (profile.name !== users[0].name && schedulingType === SchedulingType.COLLECTIVE);

  return (
    <>
      {entity.orgSlug ? (
        <UserAvatarGroupWithOrg
          size="sm"
          className="border-muted"
          organization={{
            slug: entity.orgSlug,
            name: entity.name || "",
          }}
          users={shownUsers}
        />
      ) : (
        <UserAvatarGroup size="sm" className="border-muted" users={shownUsers} />
      )}

      <p className="text-subtle mt-2 text-sm font-semibold">
        {showOnlyProfileName
          ? profile.name
          : shownUsers
              .map((user) => user.name)
              .filter((name) => name)
              .join(", ")}
      </p>
    </>
  );
};
