import process from "node:process";
import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import prisma from "@calcom/prisma";
import type { Prisma, UserPermissionRole } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { uuid } from "short-uuid";
import type z from "zod";

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
      (user.completedOnboarding ?? true)
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

type OAuthClientInput = {
  clientId: string;
  clientSecret: string;
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  enablePkce: boolean;
};

export async function createOAuthClientForUser(userId: number, oAuthClient: OAuthClientInput) {
  const { enablePkce, ...restOfOAuthClient } = oAuthClient;
  await prisma.oAuthClient.create({
    data: {
      userId,
      ...restOfOAuthClient,
      clientType: enablePkce ? "PUBLIC" : "CONFIDENTIAL",
    },
  });
  console.log(`\t👤 Created OAuth2 client '${oAuthClient.name}' for user with id '${userId}'`);
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
        createdAt: new Date(),
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

export async function seedAttributes(teamId: number) {
  const mockAttributes = [
    {
      name: "Department",
      type: "SINGLE_SELECT",
      options: ["Engineering", "Sales", "Marketing", "Product", "Design"],
    },
    {
      name: "Location",
      type: "SINGLE_SELECT",
      options: ["New York", "London", "Tokyo", "Berlin", "Remote"],
    },
    {
      name: "Skills",
      type: "MULTI_SELECT",
      options: ["JavaScript", "React", "Node.js", "Python", "Design", "Sales"],
    },
    {
      name: "Years of Experience",
      type: "NUMBER",
    },
    {
      name: "Bio",
      type: "TEXT",
    },
  ];
  // Check if attributes already exist
  const existingAttributes = await prisma.attribute.findMany({
    where: {
      teamId: teamId,
      name: {
        in: mockAttributes.map((attr) => attr.name),
      },
    },
  });

  if (existingAttributes.length > 0) {
    console.log(`Skipping attributes seed, attributes already exist`);
    return;
  }

  // Get team members
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: teamId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  console.log(`🎯 Creating attributes for team ${teamId}`);

  const attributeRaw: { id: string; options: { id: string; value: string }[] }[] = [];

  for (const attr of mockAttributes) {
    const attribute = await prisma.attribute.create({
      data: {
        name: attr.name,
        slug: attr.name.toLowerCase().replace(/ /g, "-"),
        type: attr.type as "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT",
        teamId: teamId,
        enabled: true,
        options: attr.options
          ? {
              create: attr.options.map((opt) => ({
                value: opt,
                slug: opt.toLowerCase().replace(/ /g, "-"),
              })),
            }
          : undefined,
      },
      include: {
        options: true,
      },
    });

    attributeRaw.push({
      id: attribute.id,
      options: attribute.options.map((opt) => ({
        id: opt.id,
        value: opt.value,
      })),
    });

    console.log(`\t📝 Created attribute: ${attr.name}`);

    // Assign random values/options to members
    for (const member of memberships) {
      if (attr.type === "TEXT") {
        const mockText = `Sample ${attr.name.toLowerCase()} text for user ${member.userId}`;
        await prisma.attributeOption.create({
          data: {
            value: mockText,
            slug: mockText.toLowerCase().replace(/ /g, "-"),
            attribute: {
              connect: {
                id: attribute.id,
              },
            },
            assignedUsers: {
              create: {
                memberId: member.id,
              },
            },
          },
        });
      } else if (attr.type === "NUMBER") {
        const mockNumber = Math.floor(Math.random() * 10 + 1).toString();
        await prisma.attributeOption.create({
          data: {
            value: mockNumber,
            slug: mockNumber,
            attribute: {
              connect: {
                id: attribute.id,
              },
            },
            assignedUsers: {
              create: {
                memberId: member.id,
              },
            },
          },
        });
      } else if (attr.type === "SINGLE_SELECT" && attribute.options.length > 0) {
        const randomOption = attribute.options[Math.floor(Math.random() * attribute.options.length)];
        await prisma.attributeToUser.create({
          data: {
            memberId: member.id,
            attributeOptionId: randomOption.id,
          },
        });
      } else if (attr.type === "MULTI_SELECT" && attribute.options.length > 0) {
        // Assign 1-3 random options
        const numOptions = Math.floor(Math.random() * 3) + 1;
        const shuffledOptions = [...attribute.options].sort(() => Math.random() - 0.5);
        const selectedOptions = shuffledOptions.slice(0, numOptions);

        for (const option of selectedOptions) {
          await prisma.attributeToUser.create({
            data: {
              memberId: member.id,
              attributeOptionId: option.id,
            },
          });
        }
      }
    }

    console.log(`\t✅ Assigned ${attr.name} values to ${memberships.length} members`);
  }
  return attributeRaw;
}
