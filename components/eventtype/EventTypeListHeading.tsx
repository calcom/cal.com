// TODO: replace headlessui with radix-ui
import { UsersIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React from "react";

import Avatar from "@components/ui/Avatar";
import Badge from "@components/ui/Badge";

interface Props {
  profile: {
    slug?: string | null;
    name?: string | null;
    image?: string | null;
  };
  membershipCount: number;
}

const EventTypeListHeading = ({ profile, membershipCount }: Props): JSX.Element => (
  <div className="flex mb-4">
    <Link href="/settings/teams">
      <a>
        <Avatar
          alt={profile?.name || ""}
          imageSrc={profile?.image || undefined}
          size={8}
          className="inline mt-1 mr-2"
        />
      </a>
    </Link>
    <div>
      <Link href="/settings/teams">
        <a className="font-bold">{profile?.name || ""}</a>
      </Link>
      {membershipCount && (
        <span className="relative ml-2 text-xs text-neutral-500 -top-px">
          <Link href="/settings/teams">
            <a>
              <Badge variant="gray">
                <UsersIcon className="inline w-3 h-3 mr-1 -mt-px" />
                {membershipCount}
              </Badge>
            </a>
          </Link>
        </span>
      )}
      {profile?.slug && (
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}`}>
          <a className="block text-xs text-neutral-500">{`${process.env.NEXT_PUBLIC_APP_URL?.replace(
            "https://",
            ""
          )}/${profile.slug}`}</a>
        </Link>
      )}
    </div>
  </div>
);

export default EventTypeListHeading;
