import type { PrismaClient } from "@calcom/prisma/client";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetAuditLogsInputSchema } from "./getAuditLogs.schema";

type GetAuditLogsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetAuditLogsInputSchema;
};

export const getAuditLogsHandler = async ({ ctx, input }: GetAuditLogsOptions) => {
    const { prisma, user } = ctx;
    const { bookingUid } = input;

    // First, get the booking to verify permissions
    const booking = await prisma.booking.findUnique({
        where: {
            uid: bookingUid,
        },
        select: {
            id: true,
            userId: true,
            eventTypeId: true,
            attendees: {
                select: {
                    email: true,
                },
            },
        },
    });

    if (!booking) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
        });
    }

    // Check if user has permission to view this booking's audit logs
    const isBookingOwner = booking.userId === user.id;
    const isAttendee = booking.attendees.some((attendee: { email: string }) => attendee.email === user.email);

    // Check if user is team admin/owner for the event type
    let isTeamAdminOrOwner = false;
    if (booking.eventTypeId) {
        const eventType = await prisma.eventType.findUnique({
            where: { id: booking.eventTypeId },
            select: {
                teamId: true,
                team: {
                    select: {
                        members: {
                            where: {
                                userId: user.id,
                                role: {
                                    in: ["ADMIN", "OWNER"],
                                },
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
            },
        });

        if (eventType?.team?.members && eventType.team.members.length > 0) {
            isTeamAdminOrOwner = true;
        }
    }

    if (!isBookingOwner && !isAttendee && !isTeamAdminOrOwner) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to view audit logs for this booking",
        });
    }

    // Fetch audit logs for this booking
    const auditLogs = await prisma.bookingAudit.findMany({
        where: {
            bookingUid: bookingUid,
        },
        include: {
            actor: {
                select: {
                    id: true,
                    type: true,
                    userUuid: true,
                    attendeeId: true,
                    email: true,
                    phone: true,
                    name: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            timestamp: "desc",
        },
    });

    // Enrich actor information with user details if userUuid exists
    const enrichedAuditLogs = await Promise.all(
        auditLogs.map(async (log: typeof auditLogs[number]) => {
            let actorDisplayName = log.actor.name || "System";
            let actorEmail = log.actor.email;

            if (log.actor.userUuid) {
                const actorUser = await prisma.user.findUnique({
                    where: { uuid: log.actor.userUuid },
                    select: {
                        name: true,
                        email: true,
                    },
                });

                if (actorUser) {
                    actorDisplayName = actorUser.name || actorUser.email;
                    actorEmail = actorUser.email;
                }
            }

            return {
                id: log.id,
                bookingUid: log.bookingUid,
                type: log.type,
                action: log.action,
                timestamp: log.timestamp.toISOString(),
                createdAt: log.createdAt.toISOString(),
                data: log.data,
                actor: {
                    ...log.actor,
                    displayName: actorDisplayName,
                    displayEmail: actorEmail,
                },
            };
        })
    );

    return {
        bookingUid,
        auditLogs: enrichedAuditLogs,
    };
};

