import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { CalIdMembershipRepository } from "@calcom/lib/server/repository/calIdMembership";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import type { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
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

export const getCalIdTeamAndEventTypeOptions = async ({ ctx, input }: GetTeamAndEventTypeOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getCalIdTeamAndEventTypeOptions.handler:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const calIdTeamId = input?.teamId;
  const isOrg = input?.isOrg;

  const skipTeamOptions = !isOrg;
  const skipEventTypes = !!isOrg;

  const userProfile = ctx.user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);
  const parentOrgHasLockedEventTypes =
    profile?.organization?.organizationSettings?.lockEventTypeCreationForUsers;

  const eventTypeRepo = new EventTypeRepository(ctx.prisma);
  const [profileMemberships, profileEventTypes] = await Promise.all([
    CalIdMembershipRepository.findAllByUpIdIncludeMinimalEventTypes(
      {
        upId: userProfile.upId,
      },
      {
        where: {
          acceptedInvitation: true,
        },
        skipEventTypes,
      }
    ),
    calIdTeamId
      ? []
      : eventTypeRepo.findAllByUpIdWithMinimalData(
          {
            upId: userProfile.upId,
            userId: user.id,
          },
          {
            where: {
              calIdTeamId: null,
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
    calIdTeam: {
      ...membership.calIdTeam,
      metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
    },
  }));

  type EventTypeGroup = {
    calIdTeamId?: number | null;
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
    calIdTeamId: null,
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
      memberships.map(async (membership) => {
        const calIdTeam = {
          ...membership.calIdTeam,
          metadata: teamMetadataSchema.parse(membership.calIdTeam.metadata),
        };

        const eventTypes = calIdTeam.eventTypes;
        return {
          calIdTeamId: calIdTeam.id,
          profile: {
            name: calIdTeam.name,
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

  const teamOptions: Option[] = [];

  if (!skipTeamOptions) {
    const profileTeamsOptions = eventTypeGroups
      .map((group) => ({
        ...group.profile,
        calIdTeamId: group.calIdTeamId,
      }))
      .filter((profile) => !!profile.calIdTeamId)
      .map((profile) => {
        return {
          value: String(profile.calIdTeamId) || "",
          label: profile.name || profile.slug || "",
        };
      });

    // // const otherTeams = await listOtherCalIdTeamHandler({ ctx });
    // const otherTeams = [];

    // const otherTeamsOptions = otherTeams
    //   ? otherTeams.map((team) => {
    //       return {
    //         value: String(team.id) || "",
    //         label: team.name || team.slug || "",
    //       };
    //     })
    //   : [];

    // teamOptions = profileTeamsOptions.concat(otherTeamsOptions);
  }

  const eventTypeOptions =
    eventTypeGroups.reduce((options, group) => {
      //       /** don't show team event types for user workflow */
      if (!calIdTeamId && group.calIdTeamId) return options;
      //       /** only show correct team event types for team workflows */
      if (calIdTeamId && calIdTeamId !== group.calIdTeamId) return options;

      return [
        ...options,
        ...(group?.eventTypes
          ?.filter((evType) => {
            const metadata = EventTypeMetaDataSchema.parse(evType.metadata);
            return (
              !metadata?.managedEventConfig ||
              !!metadata?.managedEventConfig.unlockedFields?.workflows ||
              !!calIdTeamId
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
