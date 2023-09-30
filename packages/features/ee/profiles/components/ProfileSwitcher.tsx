import { useSession, signIn } from "next-auth/react";
import React, { useState } from "react";

import useProfilesQuery from "@calcom/features/ee/profiles/hooks/useProfilesQuery";
import classNames from "@calcom/lib/classNames";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@calcom/ui";
import { ChevronDown, Check } from "@calcom/ui/components/icon";

interface ProfileSwitcherProps {
  small?: boolean;
  UserDropdown: React.ElementType;
}

export const ProfileSwitcher = ({ small, UserDropdown }: ProfileSwitcherProps) => {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const { data: session, status: statusSession } = useSession();
  const { data: profiles, status: statusProfiles } = useProfilesQuery();
  const bookerUrl = useBookerUrl();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;
  if (statusSession === "loading" || statusProfiles === "loading") return <UserDropdown small={small} />;
  if (!session?.hasValidLicense || !profiles || profiles.length === 1) return <UserDropdown small={small} />;

  return (
    <>
      <Dropdown open={menuOpen}>
        <DropdownMenuTrigger asChild onClick={() => setMenuOpen((menuOpen) => !menuOpen)}>
          <button
            className={classNames(
              "hover:bg-emphasis group mx-0 flex cursor-pointer appearance-none items-center rounded-full text-left outline-none focus:outline-none focus:ring-0 md:rounded-none lg:rounded",
              small ? "p-2" : "px-2 py-1.5"
            )}>
            <span
              className={classNames(
                small ? "h-4 w-4" : "h-5 w-5 ltr:mr-2 rtl:ml-2",
                "relative flex-shrink-0 rounded-full "
              )}>
              {session.user.org ? (
                <Avatar
                  alt={`${session.user.org.name} logo`}
                  imageSrc={`${session.user.org.fullDomain}/org/${session.user.org.slug}/avatar.png`}
                  size="xsm"
                />
              ) : (
                <Avatar
                  size={small ? "xs" : "xsm"}
                  imageSrc={bookerUrl + "/" + user.username + "/avatar.png"}
                  alt={user.username || "Nameless User"}
                  className="overflow-hidden"
                />
              )}
              {!user.organizationId && (
                <span
                  className={classNames(
                    "border-muted absolute -bottom-1 -right-1 rounded-full border bg-green-500",
                    user.away ? "bg-yellow-500" : "bg-green-500",
                    small ? "-bottom-0.5 -right-0.5 h-2.5 w-2.5" : "-bottom-0.5 -right-0 h-2 w-2"
                  )}
                />
              )}
            </span>
            {!small && (
              <span className="flex flex-grow items-center gap-2">
                <span className="line-clamp-1 flex-grow text-sm leading-none">
                  <span className="text-emphasis block font-medium">
                    {session.user.org ? session.user.org.name : user.name || "Nameless User"}
                  </span>
                </span>
                <ChevronDown
                  className="group-hover:text-subtle text-muted h-4 w-4 flex-shrink-0 rtl:mr-4"
                  aria-hidden="true"
                />
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="start"
            onInteractOutside={() => {
              setMenuOpen(false);
            }}
            className="group w-64 space-y-1 overflow-hidden rounded-md px-2 pb-2 pt-1">
            {profiles.map((profile, idx) => (
              <DropdownMenuItem key={idx} className="rounded-md">
                <DropdownItem
                  type="button"
                  className="rounded-md"
                  childrenClassName="w-full"
                  onClick={() => signIn("profile-auth", { userId: profile.id })}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {profile.org ? (
                        <Avatar
                          alt={`${profile.org.name} logo`}
                          imageSrc={`${profile.org.fullDomain}/org/${profile.org.slug}/avatar.png`}
                          size="xsm"
                        />
                      ) : (
                        <Avatar
                          size="xsm"
                          imageSrc={bookerUrl + "/" + profile.username + "/avatar.png"}
                          alt={profile.username || "Nameless User"}
                          className="overflow-hidden"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="line-clamp-1 flex-grow text-sm leading-none">
                          <span className="text-emphasis block text-left font-normal">
                            {profile.org ? profile.org.name : profile.name || profile.username}
                          </span>
                        </span>
                        <span className="text-subtle block text-left text-xs font-normal">
                          {profile.org
                            ? `${profile.org.fullDomain.replace("https://", "")?.replace("http://", "")}/${
                                profile.username
                              }`
                            : `${WEBSITE_URL.replace("https://", "")?.replace("http://", "")}/${
                                profile.username
                              }`}
                        </span>
                      </div>
                    </div>
                    {profile.selected && <Check className="text-emphasis h-4 w-4" />}
                  </div>
                </DropdownItem>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </Dropdown>
      <UserDropdown small dots={!user.organizationId} />
    </>
  );
};
