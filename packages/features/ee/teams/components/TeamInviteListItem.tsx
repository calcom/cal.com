import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
} from "@calcom/ui";
import { Ban, Check, MoreHorizontal, X } from "@calcom/ui/components/icon";

interface Props {
  team: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logo?: string | null;
    bio?: string | null;
    hideBranding?: boolean | undefined;
    role: MembershipRole;
    accepted: boolean;
  };
  key: number;
  onActionSelect: (text: string) => void;
  isLoading?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function TeamInviteListItem(props: Props) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const team = props.team;

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: async () => {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.list.invalidate();
    },
  });

  function acceptOrLeave(accept: boolean) {
    acceptOrLeaveMutation.mutate({
      teamId: team?.id as number,
      accept,
    });
  }

  const acceptInvite = () => acceptOrLeave(true);
  const declineInvite = () => acceptOrLeave(false);

  const isInvitee = !props.team.accepted;

  if (!team) return <></>;

  const teamInfo = (
    <div className="flex">
      <Avatar
        size="mdLg"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className=""
      />
      <div className="ms-3 inline-block">
        <span className="text-emphasis text-sm font-semibold">{team.name}</span>
        <span className="text-default block text-sm leading-5">
          {t("invited_by_team", { teamName: team.name, role: t(team.role.toLocaleLowerCase()) })}
        </span>
      </div>
    </div>
  );

  return (
    <li className="bg-subtle border-emphasis divide-subtle divide-y rounded-md border px-5 py-4">
      <div
        className={classNames(
          "flex items-center  justify-between",
          !isInvitee && "group hover:bg-neutral-50"
        )}>
        {teamInfo}
        <div>
          <>
            <div className="hidden sm:flex">
              <Button
                type="button"
                className="border-empthasis mr-3"
                variant="icon"
                color="secondary"
                onClick={declineInvite}
                StartIcon={Ban}
              />
              <Button
                type="button"
                className="border-empthasis"
                variant="icon"
                color="secondary"
                onClick={acceptInvite}
                StartIcon={Check}
              />
            </div>
            <div className="block sm:hidden">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" color="minimal" variant="icon" StartIcon={MoreHorizontal} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <DropdownItem type="button" StartIcon={Check} onClick={acceptInvite}>
                      {t("accept")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DropdownItem color="destructive" type="button" StartIcon={X} onClick={declineInvite}>
                      {t("reject")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          </>
        </div>
      </div>
    </li>
  );
}
