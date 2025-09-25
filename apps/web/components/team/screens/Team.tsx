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

const Member = ({ member, teamName }: { member: MemberType; teamName: string | null }) => {
  const routerQuery = useRouterQuery();
  const { t } = useLocale();
  const isBioEmpty = !member.bio || !member.bio.replace("<p><br></p>", "").length;

  // We don't want to forward orgSlug and user which are route params to the next route
  const { slug: _slug, orgSlug: _orgSlug, user: _user, ...queryParamsToForward } = routerQuery;

  return (
    <div className="hover:bg-muted border-subtle bg-primary rounded-lg border p-6 shadow-md transition-shadow hover:scale-[1.02]">
      <div className="mb-4 flex items-center">
        <UserAvatar noOrganizationIndicator size="md" user={member} />
        <div className="ml-3">
          <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {!isBioEmpty ? (
            <div
              className="text-sm text-gray-600"
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
        <Button className="bg-active text-default flex w-full items-center justify-center rounded px-4 py-2 font-medium">
          <Icon name="calendar" className="mr-2 h-4 w-4" />
          Book with {member.name}
        </Button>
      </Link>
    </div>
  );
};

const Members = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="team-members-container"
      className="flex flex-wrap justify-center gap-6 p-6 lg:px-12 xl:px-24">
      {members.map((member) => {
        return member.username !== null && <Member key={member.id} member={member} teamName={teamName} />;
      })}
    </section>
  );
};

const Team = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  return (
    <div className="mb-8">
      <Members members={members} teamName={teamName} />
    </div>
  );
};

export default Team;
