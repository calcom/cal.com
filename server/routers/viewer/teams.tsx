import { MembershipRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";

import { BASE_URL } from "@lib/config/constants";
import { sendTeamInviteEmail } from "@lib/emails/email-manager";
import { TeamInvite } from "@lib/emails/templates/team-invite-email";
import { getUserAvailability } from "@lib/queries/availability";
import { getTeamWithMembers, isTeamAdmin, isTeamOwner } from "@lib/queries/teams";
import slugify from "@lib/slugify";

import { createProtectedRouter } from "@server/createRouter";
import { getTranslation } from "@server/lib/i18n";
import { TRPCError } from "@trpc/server";

export const viewerTeamsRouter = createProtectedRouter()
  // Retrieves team by id
  .query("get", {
    input: z.object({
      teamId: z.number(),
    }),
    async resolve({ ctx, input }) {
      const team = await getTeamWithMembers(input.teamId);
      if (!team?.members.find((m) => m.id === ctx.user.id)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not a member of this team." });
      }
      const membership = team?.members.find((membership) => membership.id === ctx.user.id);
      return { ...team, membership: { role: membership?.role as MembershipRole } };
    },
  })
  // Returns teams I a member of
  .query("list", {
    async resolve({ ctx }) {
      const memberships = await ctx.prisma.membership.findMany({
        where: {
          userId: ctx.user.id,
        },
        orderBy: { role: "desc" },
      });
      const teams = await ctx.prisma.team.findMany({
        where: {
          id: {
            in: memberships.map((membership) => membership.teamId),
          },
        },
      });

      return memberships.map((membership) => ({
        role: membership.role,
        accepted: membership.role === "OWNER" ? true : membership.accepted,
        ...teams.find((team) => team.id === membership.teamId),
      }));
    },
  })
  .mutation("create", {
    input: z.object({
      name: z.string(),
    }),
    async resolve({ ctx, input }) {
      if (ctx.user.plan === "FREE") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not a pro user." });
      }

      const slug = slugify(input.name);

      const nameCollisions = await ctx.prisma.team.count({
        where: {
          OR: [{ name: input.name }, { slug: slug }],
        },
      });

      if (nameCollisions > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team name already taken." });

      const createTeam = await ctx.prisma.team.create({
        data: {
          name: input.name,
          slug: slug,
        },
      });

      await ctx.prisma.membership.create({
        data: {
          teamId: createTeam.id,
          userId: ctx.user.id,
          role: "OWNER",
          accepted: true,
        },
      });
    },
  })
  // Allows team owner to update team metadata
  .mutation("update", {
    input: z.object({
      id: z.number(),
      bio: z.string().optional(),
      name: z.string().optional(),
      logo: z.string().optional(),
      slug: z.string().optional(),
      hideBranding: z.boolean().optional(),
    }),
    async resolve({ ctx, input }) {
      if (!(await isTeamAdmin(ctx.user?.id, input.id))) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (input.slug) {
        const userConflict = await ctx.prisma.team.findMany({
          where: {
            slug: input.slug,
          },
        });
        if (userConflict.some((t) => t.id !== input.id)) return;
      }
      await ctx.prisma.team.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          slug: input.slug,
          logo: input.logo,
          bio: input.bio,
          hideBranding: input.hideBranding,
        },
      });
    },
  })
  .mutation("delete", {
    input: z.object({
      teamId: z.number(),
    }),
    async resolve({ ctx, input }) {
      if (!(await isTeamOwner(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

      // delete all memberships
      await ctx.prisma.membership.deleteMany({
        where: {
          teamId: input.teamId,
        },
      });

      await ctx.prisma.team.delete({
        where: {
          id: input.teamId,
        },
      });
    },
  })
  // Allows owner to remove member from team
  .mutation("removeMember", {
    input: z.object({
      teamId: z.number(),
      memberId: z.number(),
    }),
    async resolve({ ctx, input }) {
      if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (ctx.user?.id === input.memberId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not remove yourself from a team you own.",
        });

      await ctx.prisma.membership.delete({
        where: {
          userId_teamId: { userId: input.memberId, teamId: input.teamId },
        },
      });
    },
  })
  .mutation("inviteMember", {
    input: z.object({
      teamId: z.number(),
      usernameOrEmail: z.string(),
      role: z.nativeEnum(MembershipRole),
      language: z.string(),
      sendEmailInvitation: z.boolean(),
    }),
    async resolve({ ctx, input }) {
      if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

      const translation = await getTranslation(input.language ?? "en", "common");

      const team = await ctx.prisma.team.findFirst({
        where: {
          id: input.teamId,
        },
      });

      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const invitee = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ username: input.usernameOrEmail }, { email: input.usernameOrEmail }],
        },
      });

      if (!invitee) {
        // liberal email match
        const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

        if (!isEmail(input.usernameOrEmail))
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Invite failed because there is no corresponding user for ${input.usernameOrEmail}`,
          });

        // valid email given, create User and add to team
        await ctx.prisma.user.create({
          data: {
            email: input.usernameOrEmail,
            invitedTo: input.teamId,
            teams: {
              create: {
                teamId: input.teamId,
                role: input.role as MembershipRole,
              },
            },
          },
        });

        const token: string = randomBytes(32).toString("hex");

        await ctx.prisma.verificationRequest.create({
          data: {
            identifier: input.usernameOrEmail,
            token,
            expires: new Date(new Date().setHours(168)), // +1 week
          },
        });

        if (ctx?.user?.name && team?.name) {
          const teamInviteEvent: TeamInvite = {
            language: translation,
            from: ctx.user.name,
            to: input.usernameOrEmail,
            teamName: team.name,
            joinLink: `${BASE_URL}/auth/signup?token=${token}&callbackUrl=${BASE_URL + "/settings/teams"}`,
          };
          await sendTeamInviteEmail(teamInviteEvent);
        }
      } else {
        // create provisional membership
        try {
          await ctx.prisma.membership.create({
            data: {
              teamId: input.teamId,
              userId: invitee.id,
              role: input.role as MembershipRole,
            },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2002") {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "This user is a member of this team / has a pending invitation.",
              });
            }
          } else throw e;
        }

        // inform user of membership by email
        if (input.sendEmailInvitation && ctx?.user?.name && team?.name) {
          const teamInviteEvent: TeamInvite = {
            language: translation,
            from: ctx.user.name,
            to: input.usernameOrEmail,
            teamName: team.name,
            joinLink: BASE_URL + "/settings/teams",
          };

          await sendTeamInviteEmail(teamInviteEvent);
        }
      }
    },
  })
  .mutation("acceptOrLeave", {
    input: z.object({
      teamId: z.number(),
      accept: z.boolean(),
    }),
    async resolve({ ctx, input }) {
      if (input.accept) {
        await ctx.prisma.membership.update({
          where: {
            userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
          },
          data: {
            accepted: true,
          },
        });
      } else {
        await ctx.prisma.membership.delete({
          where: {
            userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
          },
        });
      }
    },
  })
  .mutation("changeMemberRole", {
    input: z.object({
      teamId: z.number(),
      memberId: z.number(),
      role: z.nativeEnum(MembershipRole),
    }),
    async resolve({ ctx, input }) {
      if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });

      const memberships = await ctx.prisma.membership.findMany({
        where: {
          teamId: input.teamId,
        },
      });

      const targetMembership = memberships.find((m) => m.userId === input.memberId);
      const myMembership = memberships.find((m) => m.userId === ctx.user.id);
      const teamHasMoreThanOneOwner = memberships.some((m) => m.role === MembershipRole.OWNER);

      if (myMembership?.role === MembershipRole.ADMIN && targetMembership?.role === MembershipRole.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not change the role of an owner if you are an admin.",
        });
      }

      if (!teamHasMoreThanOneOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not change the role of the only owner of a team.",
        });
      }

      if (myMembership?.role === MembershipRole.ADMIN && input.memberId === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can not change yourself to a higher role.",
        });
      }

      await ctx.prisma.membership.update({
        where: {
          userId_teamId: { userId: input.memberId, teamId: input.teamId },
        },
        data: {
          role: input.role,
        },
      });
    },
  })
  .query("getMemberAvailability", {
    input: z.object({
      teamId: z.number(),
      memberId: z.number(),
      timezone: z.string(),
      dateFrom: z.string(),
      dateTo: z.string(),
    }),
    async resolve({ ctx, input }) {
      const team = await isTeamAdmin(ctx.user?.id, input.teamId);
      if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });

      // verify member is in team
      const members = await ctx.prisma.membership.findMany({
        where: { teamId: input.teamId },
        include: { user: true },
      });
      const member = members?.find((m) => m.userId === input.memberId);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (!member.user.username)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Member doesn't have a username" });

      // get availability for this member
      const availability = await getUserAvailability({
        username: member.user.username,
        timezone: input.timezone,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });

      return availability;
    },
  });
