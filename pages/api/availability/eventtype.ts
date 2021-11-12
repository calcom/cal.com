import { EventTypeCustomInput, MembershipRole, EventType, User } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession, Session } from "@lib/auth";
import prisma from "@lib/prisma";
import eventTypeSchema from "@lib/schemas/eventType";

type OpeningHour = {
  id?: number;
  label?: string;
  days: number[];
  startTime: number;
  endTime: number;
  userId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  eventTypeId?: number;
};

type NextApiHandlerProps<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>,
  props?: {
    session: Session;
    data?: (EventType & { users: User[] }) | null;
  }
) => void | Promise<void>;

interface Handler {
  get?: NextApiHandlerProps;
  post?: NextApiHandlerProps;
  put?: NextApiHandlerProps;
  patch?: NextApiHandlerProps;
  delete?: NextApiHandlerProps;
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

export function route(methodsHandler: Handler = {}) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!session.user?.id) {
      console.error("Session is missing a user id");
      return res.status(500).json({ message: "Something went wrong" });
    }

    const eventType = !req.body.id
      ? null
      : await prisma.eventType.findUnique({
          where: { id: req.body.id },
          include: {
            users: true,
          },
        });
    if (req.body.id) {
      if (!eventType) {
        return res.status(404).json({ message: "No event exists matching that id." });
      }

      const isAuthorized = () => {
        if (eventType.team) {
          return eventType.team.members.find(
            ({ userId, role }) => userId === session?.user?.id && role === MembershipRole.OWNER
          );
        }
        return (
          eventType.userId === session?.user?.id ||
          eventType.users.find((user) => {
            return user.id === session.user?.id;
          })
        );
      };

      if (!isAuthorized()) {
        console.warn(
          `User ${session.user.id} attempted to an access an event ${eventType.id} they do not own.`
        );
        return res.status(403).json({ message: "No event exists matching that id." });
      }
    }

    const method = `${req.method}`.toLowerCase() as keyof Handler;
    if (methodsHandler[method]) {
      const methodHandler = methodsHandler[method] as NextApiHandlerProps;
      const schema = eventTypeSchema[method];
      const { success, error } = schema.safeParse(req.body) as { success: boolean; error?: any };
      if (!success) {
        const issues = error?.issues as Array<{ message: string; received: string; path: string[] }>;
        return res.status(422).json({
          message: "Validation errors",
          validationErrors: issues.map(({ message, received, path: [field] }) => ({
            message,
            field,
            received,
          })),
        });
      }
      return methodHandler(req, res, { session, data: eventType });
    }
    return res.status(404).json({ message: "Not found" });
  };
}

export default route({
  post: async (req, res, props) => {
    const { session } = props || {};
    const eventTypes = await prisma.eventType.findMany({
      where: {
        AND: {
          slug: String(req.body.slug).trim(),
        },
      },
      include: {
        users: true,
      },
    });

    const conflictEventType = eventTypes.find(({ users }) => {
      return users.find((user) => user.id === session?.user?.id);
    });

    if (conflictEventType) {
      return res.status(409).json({ message: "Conflict title of event", eventTypes: conflictEventType });
    }

    const eventType = await prisma.eventType.create({
      data: {
        ...req.body,
        slug: String(req.body.slug).trim(),
        price: Number(req.body.price) || undefined,
        minimumBookingNotice: Number(req.body.minimumBookingNotice) || undefined,
        length: Number(req.body.length),
        users: {
          connect: {
            id: Number(session?.user?.id || null),
          },
        },
        team: req.body.teamId ? { connect: { id: req.body.teamId } } : undefined,
        customInputs: handleCustomInputs(req.body.customInputs as EventTypeCustomInput[], req.body.id),
      },
    });
    return res.status(201).json({ eventType });
  },
  patch: async (req, res, props) => {
    const { session, data } = props || {};
    const { id } = data || {};
    const eventTypeId = id;
    let availabilityToCreate: Array<{ startTime: number; endTime: number; days: number[] }> = [];
    if (req.body.availability) {
      const { openingHours = [] }: { openingHours: OpeningHour[] } = req.body.availability;

      await prisma.availability.deleteMany({
        where: {
          eventTypeId,
        },
      });

      availabilityToCreate = openingHours.map(({ startTime, endTime, days }) => ({
        startTime,
        endTime,
        days,
      }));
    }

    if (req.body.slug) {
      const eventTypes = await prisma.eventType.findMany({
        where: {
          AND: {
            slug: String(req.body.slug).trim(),
          },
        },
        include: {
          users: true,
        },
      });

      const eventType = eventTypes.find(({ id, users }) => {
        return users.find((user) => user.id === session?.user?.id) && id !== eventTypeId;
      });

      if (eventType) {
        return res.status(409).json({ message: "Conflict title of event", eventTypes });
      }
    }

    const eventType = await prisma.eventType.update({
      where: {
        id: eventTypeId,
      },
      data: {
        ...req.body,
        slug: String(req.body.slug).trim(),
        price: Number(req.body.price) || undefined,
        customInputs: handleCustomInputs(req.body.customInputs as EventTypeCustomInput[], req.body.id),
        minimumBookingNotice: Number(req.body.minimumBookingNotice) || undefined,
        length: Number(req.body.length) || undefined,
        users: !req.body.users
          ? undefined
          : {
              set: [],
              connect: req.body.users.map((id: string) => ({ id: parseInt(id) })),
            },
        availability:
          availabilityToCreate.length > 0 ? { createMany: { data: availabilityToCreate } } : undefined,
      },
    });
    return res.status(200).json({ eventType });
  },
  delete: async (req, res, props) => {
    const { data } = props || {};
    const { id } = data || {};
    await prisma.eventTypeCustomInput.deleteMany({
      where: {
        eventTypeId: id,
      },
    });

    await prisma.eventType.delete({
      where: { id },
    });
    return res.status(200).json({});
  },
});
