import { UsersIcon } from "@heroicons/react/solid";
import Link from "next/link";

import { inferQueryOutput } from "@lib/trpc";

import Avatar from "@components/ui/Avatar";
import Badge from "@components/ui/Badge";

type EventTypeGroups = inferQueryOutput<"viewer.eventTypes">["eventTypeGroups"];
type EventTypeGroupProfile = EventTypeGroups[number]["profile"];
interface EventTypeListHeadingProps {
  profile: EventTypeGroupProfile;
  membershipCount: number;
}
const EventTypeListHeading = ({ profile, membershipCount }: EventTypeListHeadingProps): JSX.Element => (
  <div className="mb-4 flex">
    <Link href="/settings/teams">
      <a>
        <Avatar
          alt={profile?.name || ""}
          imageSrc={profile?.image || undefined}
          size={8}
          className="mt-1 inline ltr:mr-2 rtl:ml-2"
        />
      </a>
    </Link>
    <div>
      <Link href="/settings/teams">
        <a className="font-bold">{profile?.name || ""}</a>
      </Link>
      {membershipCount && (
        <span className="text-neutral-500 relative -top-px text-xs ltr:ml-2 rtl:mr-2">
          <Link href="/settings/teams">
            <a>
              <Badge variant="gray">
                <UsersIcon className="mr-1 -mt-px inline h-3 w-3" />
                {membershipCount}
              </Badge>
            </a>
          </Link>
        </span>
      )}
      {profile?.slug && (
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/${profile.slug}`}>
          <a className="text-neutral-500 block text-xs">{`${process.env.NEXT_PUBLIC_APP_URL?.replace(
            "https://",
            ""
          )}/${profile.slug}`}</a>
        </Link>
      )}
    </div>
  </div>
);

export default EventTypeListHeading;
