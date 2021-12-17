import { EventTypeCustomInput, MembershipRole, Prisma, PeriodType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { WorkingHours } from "@lib/types/schedule";

function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

function handlePeriodType(periodType: string): PeriodType | undefined {
  if (typeof periodType !== "string") return undefined;
  const passedPeriodType = periodType.toUpperCase();
  if (!isPeriodType(passedPeriodType)) return undefined;
  return PeriodType[passedPeriodType];
}

function handleCustomInputs(customInputs: EventTypeCustomInput[], eventTypeId: number) {
  if (!customInputs || !customInputs?.length) return undefined;
  const cInputsIdsToDelete = customInputs.filter((input) => input.id > 0).map((e) => e.id);
  const cInputsToCreate = customInputs
    .filter((input) => input.id < 0)
    .map((input) => ({
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
    }));
  const cInputsToUpdate = customInputs
    .filter((input) => input.id > 0)
    .map((input) => ({
      data: {
        type: input.type,
        label: input.label,
        required: input.required,
        placeholder: input.placeholder,
      },
      where: {
        id: input.id,
      },
    }));

  return {
    deleteMany: {
      eventTypeId,
      NOT: {
        id: { in: cInputsIdsToDelete },
      },
    },
    createMany: {
      data: cInputsToCreate,
    },
    update: cInputsToUpdate,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!session.user?.id) {
    console.error("Session is missing a user id");
    return res.status(500).json({ message: "Something went wrong" });
  }

  if (req.method !== "POST") {
    const event = await prisma.eventType.findUnique({
      where: { id: req.body.id },
      include: {
        users: true,
        team: {
          select: {
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "No event exists matching that id." });
    }

    const isAuthorized = (function () {
      if (event.team) {
        return event.team.members
          .filter((member) => member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN)
          .map((member) => member.userId)
          .includes(session.user.id);
      }
      return (
        event.userId === session.user.id ||
        event.users.find((user) => {
          return user.id === session.user?.id;
        })
      );
    })();

    if (!isAuthorized) {
      console.warn(`User ${session.user.id} attempted to an access an event ${event.id} they do not own.`);
      return res.status(403).json({ message: "No event exists matching that id." });
    }
  }

  if (req.method === "PATCH" || req.method === "POST") {
    const data: Prisma.EventTypeCreateInput | Prisma.EventTypeUpdateInput = {
      title: req.body.title,
      slug: req.body.slug.trim(),
      description: req.body.description,
      length: parseInt(req.body.length),
      hidden: req.body.hidden,
      requiresConfirmation: req.body.requiresConfirmation,
      disableGuests: req.body.disableGuests,
      locations: req.body.locations,
      eventName: req.body.eventName,
      customInputs: handleCustomInputs(req.body.customInputs as EventTypeCustomInput[], req.body.id),
      periodType: handlePeriodType(req.body.periodType),
      periodDays: req.body.periodDays,
      periodStartDate: req.body.periodStartDate,
      periodEndDate: req.body.periodEndDate,
      periodCountCalendarDays: req.body.periodCountCalendarDays,
      minimumBookingNotice:
        req.body.minimumBookingNotice || req.body.minimumBookingNotice === 0
          ? parseInt(req.body.minimumBookingNotice, 10)
          : undefined,
      price: req.body.price,
      currency: req.body.currency,
    };

    if (req.body.schedulingType) {
      data.schedulingType = req.body.schedulingType;
    }

    if (req.method == "POST") {
      if (req.body.teamId) {
        data.team = {
          connect: {
            id: req.body.teamId,
          },
        };
      }

      const eventType = await prisma.eventType.create({
        data: {
          ...(data as Prisma.EventTypeCreateInput),
          users: {
            connect: {
              id: session?.user?.id,
            },
          },
        },
      });
      res.status(201).json({ eventType });
    } else if (req.method == "PATCH") {
      if (req.body.users) {
        data.users = {
          set: [],
          connect: req.body.users.map((id: string) => ({ id: parseInt(id) })),
        };
      }

      if (req.body.timeZone) {
        data.timeZone = req.body.timeZone;
      }

      if (req.body.availability) {
        const openingHours: WorkingHours[] = req.body.availability.openingHours || [];
        // const overrides = req.body.availability.dateOverrides || [];

        const eventTypeId = +req.body.id;
        if (eventTypeId) {
          await prisma.availability.deleteMany({
            where: {
              eventTypeId,
            },
          });
        }

        const availabilityToCreate = openingHours.map((openingHour) => ({
          startTime: new Date(openingHour.startTime),
          endTime: new Date(openingHour.endTime),
          days: openingHour.days,
        }));

        data.availability = {
          createMany: {
            data: availabilityToCreate,
          },
        };
      }

      const eventType = await prisma.eventType.update({
        where: {
          id: req.body.id,
        },
        data,
      });
      res.status(200).json({ eventType });
    }
  }

  if (req.method == "DELETE") {
    await prisma.eventTypeCustomInput.deleteMany({
      where: {
        eventTypeId: req.body.id,
      },
    });

    await prisma.eventType.delete({
      where: {
        id: req.body.id,
      },
    });

    res.status(200).json({});
  }
}
