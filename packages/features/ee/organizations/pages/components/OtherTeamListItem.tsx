import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
} from "@calcom/ui";
import { Edit2, ExternalLink, Link as LinkIcon, MoreHorizontal, Trash } from "@calcom/ui/components/icon";

import { useOrgBranding } from "../../../organizations/context/provider";

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

  const orgBranding = useOrgBranding();

  const { hideDropdown, setHideDropdown } = props;

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
          {team.slug
            ? orgBranding
              ? `${orgBranding.fullDomain}/${team.slug}`
              : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`
            : "Unpublished team"}
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
                        `${
                          orgBranding
                            ? `${orgBranding.fullDomain}`
                            : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team`
                        }/${team.slug}`
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
                      href={`/settings/teams/other/${team.id}/profile`}
                      StartIcon={Edit2}>
                      {t("edit_team") as string}
                    </DropdownItem>
                  </DropdownMenuItem>

                  {team.slug && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        target="_blank"
                        href={`${
                          orgBranding
                            ? `${orgBranding.fullDomain}`
                            : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/other`
                        }/${team.slug}`}
                        StartIcon={ExternalLink}>
                        {t("preview_team") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem>
                    <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                      <DialogTrigger asChild>
                        <DropdownItem
                          color="destructive"
                          type="button"
                          StartIcon={Trash}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}>
                          {t("disband_team")}
                        </DropdownItem>
                      </DialogTrigger>
                      <ConfirmationDialogContent
                        variety="danger"
                        title={t("disband_team")}
                        confirmBtnText={t("confirm_disband_team")}
                        isLoading={props.isLoading}
                        onConfirm={() => {
                          props.onActionSelect("disband");
                        }}>
                        {t("disband_team_confirmation_message")}
                      </ConfirmationDialogContent>
                    </Dialog>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </ButtonGroup>
          </div>
        </div>
      </div>
    </li>
  );
}
