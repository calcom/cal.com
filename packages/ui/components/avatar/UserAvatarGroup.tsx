import { useEffect, useState } from "react";

import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";

import { AvatarGroup } from "./AvatarGroup";

/**
 * Minimal user data needed for UserAvatarGroup component.
 * This type is intentionally minimal to reduce client payload size.
 */
export type UserAvatarGroupUser = {
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  avatar?: string;
  profile: {
    username: string | null;
    organization: {
      slug: string | null;
    } | null;
  } | null;
};

type UserAvatarProps = Omit<React.ComponentProps<typeof AvatarGroup>, "items"> & {
  users: UserAvatarGroupUser[];
};

type AvatarItem = {
  href: string | null;
  alt: string;
  title: string;
  image: string;
};

export function UserAvatarGroup(props: UserAvatarProps) {
  const { users, ...rest } = props;

  const [items, setItems] = useState<AvatarItem[]>(
    users.map((user) => ({
      href: null,
      alt: user.name || "",
      title: user.name || "",
      image: getUserAvatarUrl(user),
    }))
  );

  useEffect(() => {
    setItems(
      users.map((user) => {
        return {
          href: `${getBookerBaseUrlSync(user.profile?.organization?.slug ?? null)}/${
            user.profile?.username
          }?redirect=false`,
          alt: user.name || "",
          title: user.name || "",
          image: getUserAvatarUrl(user),
        };
      })
    );
  }, [users]);

  return <AvatarGroup {...rest} items={items} />;
}
