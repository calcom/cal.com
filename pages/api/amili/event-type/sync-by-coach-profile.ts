import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";

type CoachProfileProgramAvailability = {
  id?: string;
  coachProfileProgramId: string;
  days: number[];
  startTime: number;
  endTime: number;
};

type CoachProfileProgram = {
  id: string;
  coachUserId: string;
  programId: string;
  assEventTypeId?: number;
  availability?: CoachProfileProgramAvailability[];
};

type ReqPayload = {
  assUserId: number;
  insertedCoachProfileProgram: CoachProfileProgram[];
  removedCoachProfileProgram: CoachProfileProgram[];
  updatedCoachProfileProgram: CoachProfileProgram[];
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;
  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { assUserId, insertedCoachProfileProgram, removedCoachProfileProgram, updatedCoachProfileProgram } =
    body as ReqPayload;

  await runMiddleware(req, res, checkAmiliAuth);

  // create event type
  await Promise.all(
    insertedCoachProfileProgram.map(async ({ id, availability }) => {
      const newAvailability = availability.map(({ days, startTime, endTime }) => ({
        days,
        startTime,
        endTime: endTime,
        userId: assUserId,
      }));

      const newCoachProgram = {
        title: "",
        slug: "",
        locations: [{ type: "integrations:zoom" }],
        length: 0,
        userId: assUserId,
        coachProgramId: id,
        availability: {
          create: newAvailability,
        },
      };

      const newProgramCreated = await prisma.eventType.create({
        data: newCoachProgram,
      });

      return newProgramCreated;
    })
  );

  const coachProgramsUpdated = updatedCoachProfileProgram.map(({ id, assEventTypeId, availability }) => ({
    availability,
    id: assEventTypeId,
    title: "",
    slug: "",
    length: 0,
    userId: assUserId,
    coachProgramId: id,
  }));

  // update event type
  await Promise.all(
    coachProgramsUpdated.map(async ({ id, availability, ...coachProgram }) => {
      const coachProgramUpdated = prisma.eventType.update({
        where: { id },
        data: coachProgram,
      });

      const availabilityDeleted = prisma.availability.deleteMany({
        where: {
          eventTypeId: id,
        },
      });

      const newAvailability = availability.map(({ days, startTime, endTime }) => ({
        days,
        startTime,
        endTime: endTime,
        userId: assUserId,
        eventTypeId: id,
      }));

      const availabilityCreated = prisma.availability.createMany({
        data: newAvailability,
      });

      await prisma.$transaction([coachProgramUpdated, availabilityDeleted, availabilityCreated]);
    })
  );

  // delete event type
  await Promise.all(
    removedCoachProfileProgram.map(async ({ assEventTypeId }) => {
      const availabilityDeleted = prisma.availability.deleteMany({
        where: { eventTypeId: assEventTypeId },
      });

      const eventTypesDeleted = prisma.eventType.delete({
        where: {
          id: assEventTypeId,
        },
      });

      await prisma.$transaction([availabilityDeleted, eventTypesDeleted]);
    })
  );

  res.status(201).json({ message: "Synchronize programs with event-type successfully" });
};

export default handler;
