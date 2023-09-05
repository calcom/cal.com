import { useSession } from "next-auth/react";

import { WEBSITE_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";
import { Edit2, ExternalLink, Link as LinkIcon, MoreHorizontal } from "@calcom/ui/components/icon";

interface Props {
  team: RouterOutputs["viewer"]["organizations"]["listOtherTeams"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isLoading?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function OtherTeamListItem(props: Props) {
  const { t } = useLocale();

  const team = props.team;

  const { data: session } = useSession();

  const { hideDropdown } = props;

  if (!team) return <></>;

  const teamInfo = (
    <div className="item-center flex px-5 py-5">
      <Avatar
        size="md"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className="inline-flex justify-center"
      />
      <div className="ms-3 inline-block truncate">
        <span className="text-default text-sm font-bold">{team.name}</span>
        <span className="text-muted block text-xs">
          {team.slug ? `${session?.user.org?.url ?? `${WEBSITE_URL}/team`}/${team.slug}` : "Unpublished team"}
        </span>
      </div>
    </div>
  );

  return (
    <li>
      <div className="hover:bg-muted group flex items-center justify-between">
        {teamInfo}
        <div className="px-5 py-5">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <ButtonGroup combined>
              {team.slug && (
                <Tooltip content={t("copy_link_team")}>
                  <Button
                    color="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${session?.user.org?.url ?? `${WEBSITE_URL}/team`}/${team.slug}`
                      );
                      showToast(t("link_copied"), "success");
                    }}
                    variant="icon"
                    StartIcon={LinkIcon}
                  />
                </Tooltip>
              )}
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="radix-state-open:rounded-r-md"
                    type="button"
                    color="secondary"
                    variant="icon"
                    StartIcon={MoreHorizontal}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent hidden={hideDropdown}>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      href={"/settings/teams/other/" + team.id + "/profile"}
                      StartIcon={Edit2}>
                      {t("edit_team") as string}
                    </DropdownItem>
                  </DropdownMenuItem>

                  {team.slug && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        target="_blank"
                        href={`${session?.user.org?.url ?? WEBSITE_URL}/team/other/${team.slug}`}
                        StartIcon={ExternalLink}>
                        {t("preview_team") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </ButtonGroup>
          </div>
        </div>
      </div>
    </li>
  );
}
