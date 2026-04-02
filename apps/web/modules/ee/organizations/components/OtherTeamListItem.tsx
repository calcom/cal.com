import process from "node:process";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { ButtonGroup } from "@calcom/ui/components/buttonGroup";
import { ConfirmationDialogContent, DialogTrigger } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

interface Props {
  team: RouterOutputs["viewer"]["organizations"]["listOtherTeams"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isPending?: boolean;
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
        imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)}
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
      <div className="hover:bg-cal-muted group flex items-center justify-between transition">
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
                    StartIcon="link"
                  />
                </Tooltip>
              )}
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="ltr:radix-state-open:rounded-r-(--btn-group-radius) rtl:radix-state-open:rounded-l-(--btn-group-radius)"
                    type="button"
                    color="secondary"
                    variant="icon"
                    StartIcon="ellipsis"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent hidden={hideDropdown}>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      href={`/settings/teams/other/${team.id}/profile`}
                      StartIcon="pencil">
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
                        StartIcon="external-link">
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
                          StartIcon="trash"
                          className="rounded-t-none"
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
                        isPending={props.isPending}
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
