import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import type { UserProfile } from "@calcom/types/UserProfile";
import { UserAvatar } from "@calcom/ui/components/avatar";
import Link from "next/link";

type TeamWithMembers = {
  id: number;
  name: string;
  slug: string | null;
  logoUrl?: string | null;
  bio?: string | null;
  members: {
    id: number;
    name: string | null;
    bio?: string | null;
    username?: string | null;
    avatar?: string | null;
  }[];
};

type TeamType = Omit<NonNullable<TeamWithMembers>, "inviteToken">;
type MembersType = TeamType["members"];
type MemberType = Pick<MembersType[number], "id" | "name" | "bio"> & {
  username: string | null;
  organizationId?: number | null;
  avatarUrl: string | null;
} & {
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
    <Link
      key={member.id}
      href={{ pathname: `${member.bookerUrl}/${member.username}`, query: queryParamsToForward }}>
      <div className="group stack-y-2 flex min-h-full flex-col rounded-md border border-subtle bg-default p-4 transition hover:cursor-pointer hover:bg-cal-muted sm:w-80">
        <UserAvatar noOrganizationIndicator size="md" user={member} />
        <section className="stack-y-1 mt-2 line-clamp-4 w-full">
          <p className="font-medium text-default">{member.name}</p>
          <div className="line-clamp-3 text-ellipsis font-normal text-sm text-subtle">
            {!isBioEmpty ? (
              <div
                className="wrap-break-word text-sm text-subtle [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                // eslint-disable-next-line react/no-danger
                // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via markdownToSafeHTML
                dangerouslySetInnerHTML={{ __html: markdownToSafeHTML(member.bio ?? null) }}
              />
            ) : (
              t("user_from_team", { user: member.name, team: teamName })
            )}
          </div>
        </section>
      </div>
    </Link>
  );
};

const Members = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="team-members-container"
      className="flex flex-col flex-wrap justify-center gap-5 sm:flex-row">
      {members.map((member) => {
        return member.username !== null && <Member key={member.id} member={member} teamName={teamName} />;
      })}
    </section>
  );
};

const Team = ({ members, teamName }: { members: MemberType[]; teamName: string | null }) => {
  return (
    <div>
      <Members members={members} teamName={teamName} />
    </div>
  );
};

export default Team;
