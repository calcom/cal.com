import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";

type CoachProfileProgramAvailability = {
  id?: string;
  coachProfileProgramId: string;
  days: number[];
  startTime: number;
  endTime: number;
};

type HealthCoachProgram = {
  id: string;
  name: string;
  description?: string;
  duration?: number;
};

type CoachProfileProgram = {
  id: string;
  coachUserId: string;
  programId: string;
  assEventTypeId?: number;
  availability?: CoachProfileProgramAvailability[];
  program?: HealthCoachProgram;
};

type ReqPayload = {
  assUserId: number;
  insertedCoachProfileProgram?: CoachProfileProgram[];
  removedCoachProfileProgram?: CoachProfileProgram[];
  updatedCoachProfileProgram?: CoachProfileProgram[];
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
  const assMapping = await Promise.all(
    (insertedCoachProfileProgram || []).map(async ({ id, program, availability }) => {
      const newAvailability = availability.map(({ days, startTime, endTime }) => ({
        days,
        startTime,
        endTime: endTime,
        userId: assUserId,
      }));

      const { name = "", description = "", duration = 0 } = program || {};

      const newCoachProgram = {
        description,
        title: name,
        slug: v4(),
        locations: [{ type: "integrations:zoom" }],
        length: duration,
        userId: assUserId,
        coachProgramId: id,
        availability: {
          create: newAvailability,
        },
      };

      const newProgramCreated = await prisma.eventType.create({
        data: newCoachProgram,
      });

      return { coachProgramId: id, assEventTypeId: newProgramCreated.id };
    })
  );

  // update event type
  await Promise.all(
    (updatedCoachProfileProgram || []).map(async ({ assEventTypeId, availability }) => {
      const availabilityDeleted = prisma.availability.deleteMany({
        where: {
          eventTypeId: assEventTypeId,
        },
      });

      const newAvailability = availability.map(({ days, startTime, endTime }) => ({
        days,
        startTime,
        endTime: endTime,
        userId: assUserId,
        eventTypeId: assEventTypeId,
      }));

      const availabilityCreated = prisma.availability.createMany({
        data: newAvailability,
      });

      await prisma.$transaction([availabilityDeleted, availabilityCreated]);
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

  res.status(200).json({ assMapping });
};

export default handler;
