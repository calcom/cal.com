import type { Prisma, UserPermissionRole } from "@prisma/client";
import { uuid } from "short-uuid";
import type z from "zod";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { MembershipRole } from "@calcom/prisma/enums";

import prisma from ".";
import type { teamMetadataSchema } from "./zod-utils";

export async function createUserAndEventType({
  user,
  eventTypes = [],
  credentials,
}: {
  user: {
    email: string;
    password: string;
    username: string;
    name: string;
    completedOnboarding?: boolean;
    timeZone?: string;
    role?: UserPermissionRole;
    theme?: "dark" | "light";
    avatarUrl?: string | null;
  };
  eventTypes?: Array<
    Prisma.EventTypeUncheckedCreateInput & {
      _bookings?: Prisma.BookingCreateInput[];
      _numBookings?: number;
    }
  >;
  credentials?: ({
    type: string;
    key: Prisma.JsonObject;
    appId: string;
  } | null)[];
}) {
  const { password: _password, ...restOfUser } = user;
  const userData = {
    ...restOfUser,
    emailVerified: new Date(),
    completedOnboarding: user.completedOnboarding ?? true,
    locale: "en",
    schedules:
      user.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
  };

  const theUser = await prisma.user.upsert({
    where: { email_username: { email: user.email, username: user.username } },
    update: userData,
    create: userData,
  });

  await prisma.userPassword.upsert({
    where: { userId: theUser.id },
    update: {
      hash: await hashPassword(user.password),
    },
    create: {
      hash: await hashPassword(user.password),
      user: {
        connect: {
          id: theUser.id,
        },
      },
    },
  });

  console.log(
    `👤 Upserted '${user.username}' with email "${user.email}" & password "${user.password}". Booking page 👉 ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}`
  );

  for (const eventTypeInput of eventTypes) {
    const { _bookings, _numBookings, ...eventTypeData } = eventTypeInput;
    let bookingFields;
    if (_bookings && _numBookings) {
      throw new Error("You can't set both _bookings and _numBookings");
    } else if (_numBookings) {
      bookingFields = [...Array(_numBookings).keys()].map((i) => ({
        startTime: dayjs()
          .add(1, "day")
          .add(i * 5 + 0, "minutes")
          .toDate(),
        endTime: dayjs()
          .add(1, "day")
          .add(i * 5 + 30, "minutes")
          .toDate(),
        title: `${eventTypeInput.title}:${i + 1}`,
        uid: uuid(),
      }));
    } else {
      bookingFields = _bookings || [];
    }
    eventTypeData.userId = theUser.id;
    eventTypeData.users = { connect: { id: theUser.id } };

    const eventType = await prisma.eventType.findFirst({
      where: {
        slug: eventTypeData.slug,
        users: {
          some: {
            id: eventTypeData.userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (eventType) {
      console.log(
        `\t📆 Event type ${eventTypeData.slug} already seems seeded - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}/${eventTypeData.slug}`
      );
      continue;
    }
    const { id } = await prisma.eventType.create({
      data: eventTypeData,
    });

    console.log(
      `\t📆 Event type ${eventTypeData.slug} with id ${id}, length ${eventTypeData.length}min - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}/${eventTypeData.slug}`
    );

    for (const bookingInput of bookingFields) {
      await prisma.booking.create({
        data: {
          ...bookingInput,
          user: {
            connect: {
              email: user.email,
            },
          },
          attendees: {
            create: {
              email: user.email,
              name: user.name,
              timeZone: "Europe/London",
            },
          },
          eventType: {
            connect: {
              id,
            },
          },
          status: bookingInput.status,
          iCalUID: "",
        },
      });
      console.log(
        `\t\t☎️ Created booking ${bookingInput.title} at ${new Date(
          bookingInput.startTime
        ).toLocaleDateString()}`
      );
    }
  }
  console.log("👤 User with it's event-types and bookings created", theUser.email);

  if (credentials) {
    for (const credential of credentials) {
      if (credential) {
        await prisma.credential.create({
          data: {
            ...credential,
            userId: theUser.id,
          },
        });

        console.log(`🔑 ${credential.type} credentials created for ${theUser.email}`);
      }
    }
  }
  return theUser;
}

export async function createTeamAndAddUsers(
  teamInput: Prisma.TeamCreateInput,
  users: { id: number; username: string; role?: MembershipRole }[] = []
) {
  const checkUnpublishedTeam = async (slug: string) => {
    return await prisma.team.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
    });
  };
  const createTeam = async (team: Prisma.TeamCreateInput) => {
    try {
      const requestedSlug = (team.metadata as z.infer<typeof teamMetadataSchema>)?.requestedSlug;
      if (requestedSlug) {
        const unpublishedTeam = await checkUnpublishedTeam(requestedSlug);
        if (unpublishedTeam) {
          throw Error("Unique constraint failed on the fields");
        }
      }
      return await prisma.team.create({
        data: {
          ...team,
        },
        include: {
          eventTypes: true,
        },
      });
    } catch (_err) {
      if (_err instanceof Error && _err.message.indexOf("Unique constraint failed on the fields") !== -1) {
        console.log(`Team '${team.name}' already exists, skipping.`);
        return;
      }
      throw _err;
    }
  };

  const team = await createTeam(teamInput);
  if (!team) {
    return;
  }

  console.log(
    `🏢 Created team '${teamInput.name}' - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${team.slug}`
  );

  for (const eventType of team.eventTypes) {
    await prisma.eventType.update({
      where: {
        id: eventType.id,
      },
      data: {
        users: {
          connect: users.map((user) => ({ id: user.id })),
        },
      },
    });
  }

  for (const user of users) {
    const { role = MembershipRole.OWNER, id, username } = user;
    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId: id,
        role: role,
        accepted: true,
      },
    });
    console.log(`\t👤 Added '${teamInput.name}' membership for '${username}' with role '${role}'`);
  }

  return team;
}
