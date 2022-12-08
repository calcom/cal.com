import { Fragment } from "react";
import shallow from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";

import { useFilterStore } from "../layout/BookingLayout";

export type ITeamMemberFilters = RouterOutputs["viewer"]["teams"]["listTeamsandMembers"];
export type ITeamMemberFilter = ITeamMemberFilters[0];

export const TeamsMemberFilter = () => {
  const { selectedUsers, pushSelectedUser, removeSelectedUser } = useFilterStore(
    (state) => ({
      selectedUsers: state.selectedUsers,
      pushSelectedUser: state.pushSelectedUser,
      removeSelectedUser: state.removeSelectedUser,
    }),
    shallow
  );
  const { t } = useLocale();
  const { data } = trpc.viewer.teams.listTeamsandMembers.useQuery();
  // Will be handled up the tree to redirect

  if (data?.length === 0) return null;

  return (
    <AnimatedPopover text={t("members")}>
      <div className="">
        {data &&
          data.map((team) => (
            <Fragment key={team.id}>
              <div className="p-4 text-xs font-medium uppercase leading-none text-gray-500">{team.name}</div>
              {team.members.map((member) => (
                <div className="item-center flex px-4 py-[6px]" key={`${member.team.id}-${member.user.id}`}>
                  <Avatar
                    imageSrc={member.user.avatar}
                    size="sm"
                    alt={`${member.user.name} Avatar`}
                    gravatarFallbackMd5="fallback"
                    className="self-center"
                    asChild
                  />
                  <span className="ml-2 mr-auto self-center truncate text-sm font-medium text-gray-700">
                    {member.user.name}
                  </span>

                  <input
                    type="checkbox"
                    checked={
                      selectedUsers.filter(
                        (selected) => selected.id === team.id && selected.user.id === member.user.id
                      ).length > 0
                    }
                    name={`${member.team.id}-${member.user.id}`}
                    onChange={(e) => {
                      if (e.target.checked) {
                        pushSelectedUser({ id: team.id, teamName: team.name, user: member.user });
                      } else if (!e.target.checked) {
                        removeSelectedUser(member.user.id);
                      }
                    }}
                    className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
                  />
                </div>
              ))}
            </Fragment>
          ))}
      </div>
    </AnimatedPopover>
  );
};
