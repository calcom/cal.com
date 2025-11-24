import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { TeamWithMembers } from "@calcom/lib/server/queries/teams";
import type { UserProfile } from "@calcom/types/UserProfile";
import { UserAvatar } from "@calcom/ui/components/avatar";

type TeamType = Omit<NonNullable<TeamWithMembers>, "inviteToken">;
type MembersType = TeamType["members"];
type MemberType = Pick<
  MembersType[number],
  "id" | "name" | "bio" | "username" | "organizationId" | "avatarUrl"
> & {
  profile: Omit<UserProfile, "upId">;
  safeBio: string | null;
  bookerUrl: string;
};

const Member = ({
  member,
  teamName,
  brandColor,
  darkBrandColor,
}: {
  member: MemberType;
  teamName: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
}) => {
  const routerQuery = useRouterQuery();
  const { t } = useLocale();
  const isBioEmpty = !member.bio || !member.bio.replace("<p><br></p>", "").length;

  // We don't want to forward orgSlug and user which are route params to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  return (
    <div className="border-default hover:bg-muted bg-default w-full rounded-md border p-6 shadow-md transition-shadow hover:scale-[1.02]">
      <div className="mb-4 flex items-center">
        <UserAvatar noOrganizationIndicator size="md" user={member} />
        <div className="ml-3">
          <h3 className="text-default text-lg font-semibold">{member.name}</h3>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-default text-sm">
          {!isBioEmpty ? (
            <div
              className="text-default text-sm"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(member.bio) }}
            />
          ) : (
            t("user_from_team", { user: member.name, team: teamName })
          )}
        </p>
      </div>

      <Link
        href={{ pathname: `${member.bookerUrl}/${member.username}`, query: queryParamsToForward }}
        className="block">
        <Button
          className="text-white dark:text-gray-950 flex w-full items-center justify-center rounded px-4 py-2 font-medium"
          brandColor={brandColor}
          darkBrandColor={darkBrandColor}>
          <Icon name="calendar" className="mr-2 h-4 w-4" />
          Book with {member.name}
        </Button>
      </Link>
    </div>
  );
};

const Members = ({
  members,
  teamName,
  brandColor,
  darkBrandColor,
}: {
  members: MemberType[];
  teamName: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
}) => {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="team-members-container"
      className="grid w-full grid-cols-1 justify-items-center gap-6 p-6 md:grid-cols-2 lg:max-w-5xl lg:grid-cols-2">
      {members.map((member) => {
        return (
          member.username !== null && (
            <Member
              key={member.id}
              member={member}
              teamName={teamName}
              brandColor={brandColor}
              darkBrandColor={darkBrandColor}
            />
          )
        );
      })}
    </section>
  );
};

const Team = ({
  members,
  teamName,
  brandColor,
  darkBrandColor,
}: {
  members: MemberType[];
  teamName: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
}) => {
  return (
    <div className="mb-8 flex flex-col items-center">
      <Members
        members={members}
        teamName={teamName}
        brandColor={brandColor}
        darkBrandColor={darkBrandColor}
      />
    </div>
  );
};

export default Team;
