import { classNames } from "@calcom/lib";
import { getOrgAvatarUrl, getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { User } from "@calcom/prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";
import { Avatar } from "@calcom/ui";

type Organization = {
  id: number;
  slug: string | null;
  requestedSlug: string | null;
  logoUrl?: string;
};

type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "alt" | "imageSrc"> & {
  user: Pick<User, "name" | "username" | "avatarUrl"> & {
    profile: Omit<UserProfile, "upId">;
  };
  noOrganizationIndicator?: boolean;
  /**
   * Useful when allowing the user to upload their own avatar and showing the avatar before it's uploaded
   */
  previewSrc?: string | null;
  alt?: string | null;
};

function OrganizationIndicator({
  size,
  organization,
  user,
}: Pick<UserAvatarProps, "size" | "user"> & { organization: Organization }) {
  const organizationUrl = organization.logoUrl ?? getOrgAvatarUrl(organization);
  return (
    <div className={classNames("absolute bottom-0 right-0 z-10", size === "lg" ? "h-6 w-6" : "h-10 w-10")}>
      <img
        data-testId="organization-logo"
        src={organizationUrl}
        alt={user.username || ""}
        className="flex h-full items-center justify-center rounded-full"
      />
    </div>
  );
}

/**
 * It is aware of the user's organization to correctly show the avatar from the correct URL
 */
export function UserAvatar(props: UserAvatarProps) {
  const { user, previewSrc = getUserAvatarUrl(user), noOrganizationIndicator, ...rest } = props;
  const organization = user.profile?.organization ?? null;
  const indicator =
    organization && !noOrganizationIndicator ? (
      <OrganizationIndicator size={props.size} organization={organization} user={props.user} />
    ) : (
      props.indicator
    );

  return <Avatar {...rest} alt={user.name || "Nameless User"} imageSrc={previewSrc} indicator={indicator} />;
}
