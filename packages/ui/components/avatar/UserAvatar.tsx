import { classNames } from "@calcom/lib";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
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

const indicatorBySize = {
  xxs: "hidden", // 14px
  xs: "hidden", // 16px
  xsm: "hidden", // 20px
  sm: "h-3 w-3", // 24px
  md: "h-4 w-4", // 32px
  mdLg: "h-5 w-5", //40px
  lg: "h-6 w-6", // 64px
  xl: "h-10 w-10", // 96px
} as const;

function OrganizationIndicator({
  size,
  organization,
  user,
}: Pick<UserAvatarProps, "size" | "user"> & { organization: Organization }) {
  const indicatorSize = size && indicatorBySize[size];
  return (
    <div className={classNames("absolute bottom-0 right-0 z-10", indicatorSize)}>
      <img
        data-testid="organization-logo"
        src={getPlaceholderAvatar(organization.logoUrl, organization.slug)}
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
