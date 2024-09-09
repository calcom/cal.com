/// <reference types="react" />
import type { Team, User } from "@calcom/prisma/client";
import { AvatarGroup } from "@calcom/ui";
type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
    users: (Pick<User, "name" | "username" | "avatarUrl"> & {
        bookerUrl: string;
    })[];
    organization: Pick<Team, "slug" | "name">;
};
export declare function UserAvatarGroupWithOrg(props: UserAvatarProps): JSX.Element;
export {};
//# sourceMappingURL=UserAvatarGroupWithOrg.d.ts.map