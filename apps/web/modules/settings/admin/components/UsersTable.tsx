import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SMSLockState } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import type { IconName } from "@calcom/ui/components/icon";
import { DropdownActions, Table } from "@calcom/ui/components/table";

const { Cell, ColumnTitle, Header, Row } = Table;

type Props = {
  setSMSLockState: (param: { userId?: number; teamId?: number; lock: boolean }) => void;
};

type User = {
  id: number;
  username: string | null;
  name: string | null;
  email: string;
  smsLockState: SMSLockState;
  avatarUrl: string | null;
};

type Team = {
  id: number;
  name: string;
  smsLockState: SMSLockState;
  slug: string | null;
  logoUrl?: string | null;
};

function UsersTable({ setSMSLockState }: Props) {
  const { data: usersAndTeams } = trpc.viewer.admin.getSMSLockStateTeamsUsers.useQuery();

  if (!usersAndTeams) {
    return <></>;
  }

  const users = usersAndTeams.users.locked.concat(usersAndTeams.users.reviewNeeded);
  const teams = usersAndTeams.teams.locked.concat(usersAndTeams.teams.reviewNeeded);

  return <LockStatusTable users={users} teams={teams} setSMSLockState={setSMSLockState} />;
}

const LockStatusTable = ({
  users = [],
  teams = [],
  setSMSLockState,
}: {
  users?: User[];
  teams?: Team[];
  setSMSLockState: (param: { userId?: number; teamId?: number; lock: boolean }) => void;
}) => {
  const { t } = useLocale();
  function getActions({ user, team }: { user?: User; team?: Team }) {
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
            lock: false,
          }),
        icon: "pencil" as IconName,
      });
    }

    return actions;
  }

  return (
    <>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">{t("user_team")}</ColumnTitle>
          <ColumnTitle>{t("status")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-auto">
            <span className="sr-only">{t("edit")}</span>
          </ColumnTitle>
        </Header>

        <tbody className="divide-subtle divide-y rounded-md">
          {users.map((user) => (
            <Row key={`user-${user.id}`}>
              <Cell widthClassNames="w-auto">
                <div className="min-h-10 flex items-center">
                  {" "}
                  <Avatar
                    size="md"
                    alt={`Avatar of ${user.username || "Nameless"}`}
                    imageSrc={getUserAvatarUrl(user)}
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
                    imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)}
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
