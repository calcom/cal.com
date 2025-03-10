import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { listOtherTeamHandler } from "../organizations/listOtherTeams.handler";
import type { TGetTeamAndEventTypeOptionsSchema } from "./getTeamAndEventTypeOptions.schema";

type GetTeamAndEventTypeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetTeamAndEventTypeOptionsSchema;
};

type Option = {
  value: string;
  label: string;
};

type res = Awaited<
  ReturnType<typeof MembershipRepository.findAllByUpIdIncludeMinimalEventTypes>
>[number]["team"]["eventTypes"][number];

type EventType = Omit<res, "forwardParamsSuccessRedirect"> & {
  children?: { id: number }[];
  canSendCalVideoTranscriptionEmails?: boolean;
};

export const getTeamAndEventTypeOptions = async ({ ctx, input }: GetTeamAndEventTypeOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getTeamAndEventTypeOptions.handler:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const teamId = input?.teamId;
  const isOrg = input?.isOrg;

  const skipTeamOptions = !isOrg;
  const skipEventTypes = !!isOrg;

  const userProfile = ctx.user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;

  const [profileMemberships, profileEventTypes] = await Promise.all([
    MembershipRepository.findAllByUpIdIncludeMinimalEventTypes(
      {
        upId: userProfile.upId,
      },
      {
        where: {
          accepted: true,
        },
        skipEventTypes,
      }
    ),
    teamId
      ? []
      : EventTypeRepository.findAllByUpIdWithMinimalData(
          {
            upId: userProfile.upId,
            userId: user.id,
          },
          {
            where: {
              teamId: null,
            },
            orderBy: [
              {
                position: "desc",
              },
              {
                id: "asc",
              },
            ],
          }
        ),
  ]);

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const memberships = profileMemberships.map((membership) => ({
    ...membership,
    team: {
      ...membership.team,
      metadata: teamMetadataSchema.parse(membership.team.metadata),
    },
  }));

  type EventTypeGroup = {
    teamId?: number | null;
    parentId?: number | null;
    bookerUrl?: string;
    profile: {
      slug?: (typeof profile)["username"] | null;
      name: (typeof profile)["name"];
      image?: string;
      eventTypesLockedByOrg?: boolean;
    };
    eventTypes?: EventType[];
  };

  let eventTypeGroups: EventTypeGroup[] = [];

  eventTypeGroups.push({
    teamId: null,
    profile: {
      slug: profile.username,
      name: profile.name,
      eventTypesLockedByOrg: parentOrgHasLockedEventTypes,
    },
    eventTypes: profileEventTypes as EventType[],
  });

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    await Promise.all(
      memberships
        .filter((mmship) => {
          if (mmship?.team?.isOrganization) {
            return false;
          }
          return true;
        })
        .map(async (membership) => {
          const team = {
            ...membership.team,
            metadata: teamMetadataSchema.parse(membership.team.metadata),
          };

          const eventTypes = team.eventTypes;
          return {
            teamId: team.id,
            parentId: team.parentId,
            profile: {
              name: team.name,
            },
            eventTypes: eventTypes
              ?.filter((evType) => {
                const res = evType.userId === null || evType.userId === user.id;
                return res;
              })
              ?.filter((evType) =>
                membership.role === MembershipRole.MEMBER
                  ? evType.schedulingType !== SchedulingType.MANAGED
                  : true
              ),
          };
        })
    )
  );

  let teamOptions: Option[] = [];

  if (!skipTeamOptions) {
    const profileTeamsOptions = eventTypeGroups
      .map((group) => ({
        ...group.profile,
        teamId: group.teamId,
      }))
      .filter((profile) => !!profile.teamId)
      .map((profile) => {
        return {
          value: String(profile.teamId) || "",
          label: profile.name || profile.slug || "",
        };
      });

    const otherTeams = await listOtherTeamHandler({ ctx });
    const otherTeamsOptions = otherTeams
      ? otherTeams.map((team) => {
          return {
            value: String(team.id) || "",
            label: team.name || team.slug || "",
          };
        })
      : [];

    teamOptions = profileTeamsOptions.concat(otherTeamsOptions);
  }

  const eventTypeOptions =
    eventTypeGroups.reduce((options, group) => {
      //       /** don't show team event types for user workflow */
      if (!teamId && group.teamId) return options;
      //       /** only show correct team event types for team workflows */
      if (teamId && teamId !== group.teamId) return options;

      return [
        ...options,
        ...(group?.eventTypes
          ?.filter((evType) => {
            const metadata = EventTypeMetaDataSchema.parse(evType.metadata);
            return (
              !metadata?.managedEventConfig ||
              !!metadata?.managedEventConfig.unlockedFields?.workflows ||
              !!teamId
            );
          })
          ?.map((eventType) => ({
            value: String(eventType.id),
            label: `${eventType.title} ${
              eventType?.children && eventType.children.length ? `(+${eventType.children.length})` : ``
            }`,
          })) ?? []),
      ];
    }, [] as Option[]) || [];

  return {
    eventTypeOptions,
    teamOptions,
  };
};
