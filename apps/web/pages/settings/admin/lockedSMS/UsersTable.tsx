import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { $Enums } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import type { IconName } from "@calcom/ui";
import { Avatar, DropdownActions, showToast, Table } from "@calcom/ui";

const { Cell, ColumnTitle, Header, Row } = Table;

//add dialog before really performing mutation
function UsersTable() {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const utils = trpc.useContext();

  const { data: usersAndTeams } = trpc.viewer.admin.getSMSLockStatusTeamsUsers.useQuery();

  const mutation = trpc.viewer.admin.setSMSLockState.useMutation({
    onSuccess: (data) => {
      console.log(`success data: ${JSON.stringify(data)}`);
      if (data) {
        showToast(`${data.name} successfully ${data.lockStatus ? "locked" : "unlocked"}`, "success");
      }
      utils.viewer.admin.getSMSLockStatusTeamsUsers.invalidate();
    },
    onError: () => {
      showToast("Error when locking/unlocking SMS sending", "error");
      utils.viewer.admin.getSMSLockStatusTeamsUsers.invalidate();
    },
  });

  if (!usersAndTeams) {
    return <></>;
  }

  function setSMSLockStatus({ userId, teamId, lock }: { userId?: number; teamId?: number; lock: boolean }) {
    mutation.mutate({
      userId,
      teamId,
      lock,
    });
  }

  //we must flatten the array of arrays from the useInfiniteQuery hook

  const users = usersAndTeams.users.locked.concat(usersAndTeams.users.reviewNeeded);
  const teams = usersAndTeams.teams.locked.concat(usersAndTeams.teams.reviewNeeded);

  return (
    <>{!!users && <LockStatusTable users={users} teams={teams} setSMSLockStatus={setSMSLockStatus} />}</>
  );
}

const LockStatusTable = ({
  users = [],
  teams = [],
  setSMSLockStatus,
}: {
  users?: {
    id: number;
    username: string | null;
    name: string | null;
    email: string;
    smsLockStatus: $Enums.SmsLockState;
  }[];
  teams?: {
    id: number;
    name: string;
    smsLockStatus: $Enums.SmsLockState;
    slug: string | null;
  }[];
  setSMSLockStatus: (param: { userId?: number; teamId?: number; lock: boolean }) => void;
}) => {
  if (users.length === 0 && teams.length === 0) {
    return <></>;
  }

  function getActions({
    user,
    team,
  }: {
    user?: {
      id: number;
      username: string | null;
      name: string | null;
      email: string;
      smsLockStatus: $Enums.SmsLockState;
    };
    team?: {
      id: number;
      name: string;
      smsLockStatus: $Enums.SmsLockState;
      slug: string | null;
    };
  }) {
    const smsLockStatus = user?.smsLockStatus ?? team?.smsLockStatus;
    if (!smsLockStatus) return [];

    const actions = [
      {
        id: "unlock-sms",
        label: smsLockStatus === $Enums.SmsLockState.LOCKED ? "Unlock SMS sending" : "Lock SMS sending",
        onClick: () =>
          setSMSLockStatus({
            userId: user ? user.id : undefined,
            teamId: team ? team.id : undefined,
            lock: smsLockStatus !== $Enums.SmsLockState.LOCKED,
          }),
        icon: "lock" as IconName,
      },
    ];
    if (smsLockStatus === $Enums.SmsLockState.REVIEW_NEEDED) {
      actions.push({
        id: "reviewed",
        label: "Mark as Reviewed",
        onClick: () =>
          setSMSLockStatus({
            userId: user ? user.id : undefined,
            teamId: team ? team.id : undefined,
            lock: smsLockStatus === $Enums.SmsLockState.REVIEW_NEEDED,
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

              <Cell>{user.smsLockStatus}</Cell>
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
              <Cell>{team.smsLockStatus}</Cell>
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
