import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

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
      },
    });

    if (!event) {
      return res.status(404).json({ message: "No event exists matching that id." });
    }

    const isAuthorized =
      event.userId === session.user.id ||
      event.users.find((user) => {
        return user.id === session.user?.id;
      });

    if (!isAuthorized) {
      console.warn(`User ${session.user.id} attempted to an access an event ${event.id} they do not own.`);
      return res.status(404).json({ message: "No event exists matching that id." });
    }
  }

  if (req.method == "PATCH" || req.method == "POST") {
    const data = {
      title: req.body.title,
      slug: req.body.slug.trim(),
      description: req.body.description,
      length: parseInt(req.body.length),
      hidden: req.body.hidden,
      requiresConfirmation: req.body.requiresConfirmation,
      locations: req.body.locations,
      eventName: req.body.eventName,
      customInputs: !req.body.customInputs
        ? undefined
        : {
            deleteMany: {
              eventTypeId: req.body.id,
              NOT: {
                id: { in: req.body.customInputs.filter((input) => !!input.id).map((e) => e.id) },
              },
            },
            createMany: {
              data: req.body.customInputs
                .filter((input) => !input.id)
                .map((input) => ({
                  type: input.type,
                  label: input.label,
                  required: input.required,
                  placeholder: input.placeholder,
                })),
            },
            update: req.body.customInputs
              .filter((input) => !!input.id)
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
              })),
          },
      periodType: req.body.periodType,
      periodDays: req.body.periodDays,
      periodStartDate: req.body.periodStartDate,
      periodEndDate: req.body.periodEndDate,
      periodCountCalendarDays: req.body.periodCountCalendarDays,
      minimumBookingNotice: req.body.minimumBookingNotice,
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
          ...data,
          users: {
            connect: {
              id: parseInt(session.user.id),
            },
          },
        },
      });
      res.status(201).json({ eventType });
    } else if (req.method == "PATCH") {
      if (req.body.users) {
        data.users = {
          set: [],
          connect: req.body.users.map((id: number) => ({ id })),
        };
      }

      if (req.body.timeZone) {
        data.timeZone = req.body.timeZone;
      }

      if (req.body.availability) {
        const openingHours = req.body.availability.openingHours || [];
        // const overrides = req.body.availability.dateOverrides || [];

        await prisma.availability.deleteMany({
          where: {
            eventTypeId: +req.body.id,
          },
        });
        Promise.all(
          openingHours.map((schedule) =>
            prisma.availability.create({
              data: {
                eventTypeId: +req.body.id,
                days: schedule.days,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            })
          )
        ).catch((error) => {
          console.log(error);
        });
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
