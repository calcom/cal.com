import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SMSLockState } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import type { IconName } from "@calcom/ui";
import { Avatar, DropdownActions, showToast, Table } from "@calcom/ui";

const { Cell, ColumnTitle, Header, Row } = Table;

function UsersTable() {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const utils = trpc.useContext();

  const { data: usersAndTeams } = trpc.viewer.admin.getSMSLockStateTeamsUsers.useQuery();

  const mutation = trpc.viewer.admin.setSMSLockState.useMutation({
    onSuccess: (data) => {
      console.log(`success data: ${JSON.stringify(data)}`);
      if (data) {
        showToast(`${data.name} successfully ${data.lockStatus ? "locked" : "unlocked"}`, "success");
      }
      utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
    },
    onError: () => {
      showToast("Error when locking/unlocking SMS sending", "error");
      utils.viewer.admin.getSMSLockStateTeamsUsers.invalidate();
    },
  });

  if (!usersAndTeams) {
    return <></>;
  }

  function setSMSLockState({ userId, teamId, lock }: { userId?: number; teamId?: number; lock: boolean }) {
    mutation.mutate({
      userId,
      teamId,
      lock,
    });
  }

  //we must flatten the array of arrays from the useInfiniteQuery hook

  const users = usersAndTeams.users.locked.concat(usersAndTeams.users.reviewNeeded);
  const teams = usersAndTeams.teams.locked.concat(usersAndTeams.teams.reviewNeeded);

  return <LockStatusTable users={users} teams={teams} setSMSLockState={setSMSLockState} />;
}

const LockStatusTable = ({
  users = [],
  teams = [],
  setSMSLockState,
}: {
  users?: {
    id: number;
    username: string | null;
    name: string | null;
    email: string;
    smsLockState: SMSLockState;
  }[];
  teams?: {
    id: number;
    name: string;
    smsLockState: SMSLockState;
    slug: string | null;
  }[];
  setSMSLockState: (param: { userId?: number; teamId?: number; lock: boolean }) => void;
}) => {
  function getActions({
    user,
    team,
  }: {
    user?: {
      id: number;
      username: string | null;
      name: string | null;
      email: string;
      smsLockState: SMSLockState;
    };
    team?: {
      id: number;
      name: string;
      smsLockState: SMSLockState;
      slug: string | null;
    };
  }) {
    const smsLockState = user?.smsLockState ?? team?.smsLockState;
    if (!smsLockState) return [];

    const actions = [
      {
        id: "unlock-sms",
        label: smsLockState === SMSLockState.LOCKED ? "Unlock SMS sending" : "Lock SMS sending",
        onClick: () =>
          setSMSLockState({
            userId: user ? user.id : undefined,
            teamId: team ? team.id : undefined,
            lock: smsLockState !== SMSLockState.LOCKED,
          }),
        icon: "lock" as IconName,
      },
    ];
    if (smsLockState === SMSLockState.REVIEW_NEEDED) {
      actions.push({
        id: "reviewed",
        label: "Mark as Reviewed",
        onClick: () =>
          setSMSLockState({
            userId: user ? user.id : undefined,
            teamId: team ? team.id : undefined,
            lock: smsLockState === SMSLockState.REVIEW_NEEDED,
          }),
        icon: "pencil" as IconName, // assuming 'review' is the correct icon for a 'Reviewed' action
      });
    }

    return actions;
  }

  return (
    <>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">User/Team</ColumnTitle>
          <ColumnTitle>Status</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">Edit</span>
          </ColumnTitle>
        </Header>

        <tbody className="divide-subtle divide-y rounded-md">
          {users.map((user) => (
            <Row key={`user-${user.id}`}>
              <Cell widthClassNames="w-auto">
                <div className="min-h-10 flex items-center">
                  {" "}
                  {/* Added items-center here */}
                  <Avatar
                    size="md"
                    alt={`Avatar of ${user.username || "Nameless"}`}
                    imageSrc={`${WEBAPP_URL}/${user.username ? user.username : "default"}/avatar.png`}
                  />
                  <div className="text-subtle ml-4 font-medium">
                    <span className="text-default">{user.name}</span>
                    <span className="ml-3">/{user.username}</span>
                    <br />
                    <span className="break-all">{user.email}</span>
                  </div>
                </div>
              </Cell>

              <Cell>{user.smsLockState}</Cell>
              <Cell widthClassNames="w-auto">
                <DropdownActions actions={getActions({ user })} />
              </Cell>
            </Row>
          ))}
          {teams.map((team) => (
            <Row key={`team-${team.id}`}>
              <Cell widthClassNames="w-auto">
                <div className="min-h-10 flex items-center">
                  <Avatar
                    size="md"
                    alt={`Avatar of ${team.name}`}
                    imageSrc={`${WEBAPP_URL}/${team.slug ? team.slug : "default"}/avatar.png`}
                  />
                  <div className="text-subtle ml-4 font-medium">
                    <span className="text-default">{team.name}</span>
                    <span className="ml-3 break-all">/team/{team.slug}</span>
                  </div>
                </div>
              </Cell>
              <Cell>{team.smsLockState}</Cell>
              <Cell widthClassNames="w-auto">
                <DropdownActions actions={getActions({ team })} />
              </Cell>
            </Row>
          ))}
        </tbody>
      </Table>
    </>
  );
};
export default UsersTable;
