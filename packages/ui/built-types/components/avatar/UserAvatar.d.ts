/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";
import { Avatar } from "@calcom/ui";
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
/**
 * It is aware of the user's organization to correctly show the avatar from the correct URL
 */
export declare function UserAvatar(props: UserAvatarProps): JSX.Element;
export {};
//# sourceMappingURL=UserAvatar.d.ts.map