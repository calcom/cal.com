import classNames from "classnames";

import TeamPill, { TeamRole } from "@calcom/ee/teams/components/TeamPill";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Button,
  ButtonGroup,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  UserAvatar,
} from "@calcom/ui";

interface Props {
  member: RouterOutputs["viewer"]["organizations"]["listOtherTeamMembers"]["rows"][number];
}

export default function MemberListItem(props: Props) {
  const { t } = useLocale();
  const { member } = props;

  const { user } = member;
  const name = user.name || user.username || user.email;
  const bookerUrl = props.member.bookerUrl;
  const bookerUrlWithoutProtocol = bookerUrl.replace(/^https?:\/\//, "");
  const bookingLink = user.username && `${bookerUrlWithoutProtocol}/${user.username}`;

  return (
    <li className="divide-subtle divide-y px-5">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between overflow-hidden sm:flex-row">
          <div className="flex">
            <UserAvatar noOrganizationIndicator size="sm" user={user} className="h-10 w-10 rounded-full" />

            <div className="ms-3 inline-block overflow-hidden">
              <div className="mb-1 flex">
                <span className="text-default mr-1 text-sm font-bold leading-4">{name}</span>

                {!props.member.accepted && <TeamPill color="orange" text={t("pending")} />}
                {props.member.role && <TeamRole role={props.member.role} />}
              </div>
              <div className="text-default flex items-center">
                <span className=" block text-sm" data-testid="member-email" data-email={user.email}>
                  {user.email}
                </span>
                {user.username != null && (
                  <>
                    <span className="text-default mx-2 block">•</span>
                    <a
                      target="_blank"
                      href={`${bookerUrl}/${user.username}`}
                      className="text-default block truncate text-sm">
                      {bookingLink}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {member.accepted && user.username && (
          <div className="flex items-center justify-center">
            <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
              <Tooltip content={t("view_public_page")}>
                <Button
                  target="_blank"
                  href={`${bookerUrl}/${user.username}`}
                  color="secondary"
                  className={classNames("rounded-r-md")}
                  variant="icon"
                  StartIcon="external-link"
                  disabled={!member.accepted}
                />
              </Tooltip>
            </ButtonGroup>

            <div className="flex md:hidden">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="outline-none">
                    <DropdownItem
                      disabled={!member.accepted}
                      href={`/${user.username}`}
                      target="_blank"
                      type="button"
                      StartIcon="external-link">
                      {t("view_public_page")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
