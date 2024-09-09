/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
import type { UserProfile } from "@calcom/types/UserProfile";
import { AvatarGroup } from "@calcom/ui";
type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
    users: (Pick<User, "name" | "username" | "avatarUrl"> & {
        profile: Omit<UserProfile, "upId">;
        hideTruncatedAvatarsCount?: boolean;
    })[];
};
export declare function UserAvatarGroup(props: UserAvatarProps): JSX.Element;
export {};
//# sourceMappingURL=UserAvatarGroup.d.ts.map