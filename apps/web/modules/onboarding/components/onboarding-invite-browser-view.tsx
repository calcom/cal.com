"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type Invite, useOnboardingStore } from "../store/onboarding-store";

type OnboardingInviteBrowserViewProps = {
  teamName?: string;
  /** If true, use organization invites instead of team invites */
  useOrganizationInvites?: boolean;
  /** Optional: Watched form invites to display in real-time. Takes precedence over store values. */
  watchedInvites?: Array<{
    email: string;
    team?: string;
    role?: string;
  }>;
};

type DisplayItem = {
  name: string;
  email: string;
  team: string;
  isReal?: boolean;
  isMigrated?: boolean;
};

export const OnboardingInviteBrowserView = ({
  teamName,
  useOrganizationInvites = false,
  watchedInvites,
}: OnboardingInviteBrowserViewProps) => {
  const pathname = usePathname();
  const { data: user } = trpc.viewer.me.get.useQuery();
  const {
    teamBrand,
    teamInvites,
    invites,
    teamDetails,
    organizationBrand,
    organizationDetails,
    migratedMembers,
    teams,
  } = useOnboardingStore();
  const { t } = useLocale();

  // Animation variants for entry and exit
  const containerVariants = {
    initial: {
      opacity: 0,
      y: -20,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: 20,
    },
  };

  // Use default values if not provided
  const rawInviterName = user?.name || user?.username || "Alex";
  const displayInviterName = rawInviterName.charAt(0).toUpperCase() + rawInviterName.slice(1);

  // Use organization or team data based on context
  const displayName = useOrganizationInvites
    ? organizationDetails.name || teamName || "Deel"
    : teamName || teamDetails.name || "Deel";
  const displayBio = useOrganizationInvites ? organizationDetails.bio || "" : teamDetails.bio || "";
  const avatar = useOrganizationInvites ? organizationBrand.logo || null : teamBrand.logo || null;

  // Get invites based on context - use watched invites if provided, otherwise fall back to store
  let actualInvites: Invite[] = [];
  if (watchedInvites) {
    // Transform watched invites to Invite format
    actualInvites = watchedInvites.map((invite) => ({
      email: invite.email,
      team: invite.team || (useOrganizationInvites ? "" : teamDetails.name),
      role: (invite.role as Invite["role"]) || "MEMBER",
    }));
  } else {
    // Fall back to store values
    actualInvites = useOrganizationInvites ? invites : teamInvites;
  }

  // Filter out empty invites (where email is empty or just whitespace)
  const validInvites = actualInvites.filter((invite) => invite.email && invite.email.trim().length > 0);

  // Add migrated members if using organization invites
  const migratedInvites: Invite[] = [];
  if (useOrganizationInvites && migratedMembers.length > 0) {
    migratedInvites.push(
      ...migratedMembers.map((member) => {
        // Find team name from teamId
        const team = teams.find((t) => t.id === member.teamId);
        return {
          email: member.email,
          team: team?.name || "",
          role: "MEMBER" as const,
        };
      })
    );
  }

  // Combine form invites with migrated members, avoiding duplicates
  const allInvites = [...validInvites];
  const existingEmails = new Set(validInvites.map((inv) => inv.email.toLowerCase()));
  migratedInvites.forEach((migratedInvite) => {
    if (!existingEmails.has(migratedInvite.email.toLowerCase())) {
      allInvites.push(migratedInvite);
      existingEmails.add(migratedInvite.email.toLowerCase());
    }
  });

  // Create empty state items
  const emptyStateItem = {
    name: t("team_member"),
    email: "name@example.com",
    team: t("team"),
  };

  // Combine actual invites with empty state to fill up to 9 items

  const displayItems: DisplayItem[] = [];
  const maxItems = 9;

  // Create a set of migrated member emails for quick lookup
  const migratedEmails = new Set(migratedMembers.map((member) => member.email.toLowerCase()));

  // Add all invites (form invites + migrated members)
  for (let i = 0; i < allInvites.length && i < maxItems; i++) {
    const invite = allInvites[i];
    const isMigrated = migratedEmails.has(invite.email.toLowerCase());
    displayItems.push({
      name: invite.email.split("@")[0] || t("team_member"),
      email: invite.email,
      team: invite.team || t("team"),
      isReal: true,
      isMigrated,
    });
  }

  // Fill remaining slots with empty state
  const remainingSlots = maxItems - displayItems.length;
  for (let i = 0; i < remainingSlots; i++) {
    displayItems.push({
      name: emptyStateItem.name,
      email: emptyStateItem.email,
      team: emptyStateItem.team,
      isReal: false,
    });
  }

  return (
    <div className="border-subtle bg-cal-muted hidden h-full w-full flex-col overflow-hidden rounded-l-2xl border xl:flex">
      {/* Content */}
      <div className="h-full px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            className="flex h-full flex-col"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: "backOut",
            }}>
            <div className="bg-default border-subtle flex flex-col rounded-2xl border">
              {useOrganizationInvites || organizationBrand.banner || avatar ? (
                <div className="relative p-1">
                  {/* Banner Image */}
                  {useOrganizationInvites && (
                    <div className="border-subtle relative h-36 w-full overflow-hidden rounded-xl border">
                      {organizationBrand.banner ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={organizationBrand.banner}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="bg-emphasis h-full w-full" />
                      )}
                    </div>
                  )}
                  {!useOrganizationInvites && organizationBrand.banner && (
                    <div className="border-subtle relative h-36 w-full overflow-hidden rounded-xl border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={organizationBrand.banner}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Organization Avatar - Overlaying the banner */}
                  {useOrganizationInvites && avatar && (
                    <div className="absolute -bottom-6 left-4">
                      <Avatar size="lg" imageSrc={avatar} alt={displayName} className="h-12 w-12 border" />
                    </div>
                  )}
                  {!useOrganizationInvites && organizationBrand.banner && avatar && (
                    <div className="absolute -bottom-6 left-4">
                      <Avatar size="lg" imageSrc={avatar} alt={displayName} className="h-12 w-12 border" />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Organization Info */}
              <div
                className={classNames(
                  `flex flex-col items-start gap-1 px-4 pb-4`,
                  useOrganizationInvites || organizationBrand.banner || avatar ? "pt-8" : "pt-4"
                )}>
                {!useOrganizationInvites && !organizationBrand.banner && avatar && (
                  <Avatar
                    size="lg"
                    imageSrc={avatar}
                    alt={displayName}
                    className="border-default mb-4 h-12 w-12 border-2"
                  />
                )}
                <h2 className="text-emphasis font-cal w-full text-left text-xl font-semibold leading-tight">
                  {displayName}
                </h2>
                <p className="text-subtle text-left text-sm font-normal leading-tight">
                  {displayBio || "We're emailing you all the details"}
                </p>
              </div>
            </div>

            {/* Email Body */}
            <div className="bg-default border-subtle mt-3 grid grid-cols-3 gap-4 rounded-t-2xl border p-6">
              {displayItems.map((item, index) => (
                <div
                  key={`${item.email}-${index}`}
                  className={`bg-default border-subtle flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border p-4 ${
                    !item.isReal ? "opacity-60" : ""
                  }`}>
                  <Avatar size="mdLg" imageSrc={undefined} alt={item.name} className="mt-4" />
                  <div className="flex w-full min-w-0 flex-col items-center gap-4">
                    <div className="flex w-full min-w-0 flex-col items-center">
                      <p className="text-default w-full truncate text-center text-sm font-semibold leading-tight">
                        {item.name}
                      </p>
                      <p className="text-subtle w-full truncate text-center text-xs font-medium leading-tight">
                        {item.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {item.team && !item.isMigrated && (
                        <div className="bg-emphasis text-emphasis line-clamp-1 max-w-[86px] truncate rounded-md px-2 py-0.5 text-xs">
                          {item.team}
                        </div>
                      )}
                      {item.isMigrated && (
                        <Badge variant="green" className="text-xs">
                          {t("migrating")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
