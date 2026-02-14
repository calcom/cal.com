import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";
import { uuid } from "short-uuid";
import type z from "zod";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import prisma from "@calcom/prisma";
import type { Prisma, UserPermissionRole } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

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

export async function seedRoutingForms(
  teamId: number,
  userId: number,
  attributeRaw: { id: string; options: { id: string; value: string }[] }[],
  javascriptEventId: number,
  salesEventId: number
) {
  const seededForm = {
    id: "948ae412-d995-4865-885a-48302588de03",
    name: `Seeded Form - Insights for ${teamId}`,
    routes: [
      {
        id: "8a898988-89ab-4cde-b012-31823f708642",
        value: "team/insights-team/team-javascript",
        eventTypeId: javascriptEventId,
      },
      {
        id: "8b2224b2-89ab-4cde-b012-31823f708642",
        value: "team/insights-team/team-sales",
        eventTypeId: salesEventId,
      },
    ],
    formFieldLocation: {
      id: "674c169a-e40a-492c-b4bb-6f5213873bd6",
    },
    formFieldSkills: {
      id: "83316968-45bf-4c9d-b5d4-5368a8d2d2a8",
    },
    formFieldEmail: {
      id: "dd28ffcf-7029-401e-bddb-ce2e7496a1c1",
    },
    formFieldManager: {
      id: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
    },
    formFieldRating: {
      id: "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729",
    },
  };

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: seededForm.id,
    },
  });
  if (form) {
    console.log(`Skipping Routing Form - Form Seed, ${seededForm.name} already exists`);
    return;
  }

  if (attributeRaw.length === 0) {
    throw new Error("No attributes found - Please call seedAttributes first");
  }

  const formFieldSkillsOptions = attributeRaw[2].options.map((opt) => ({
    id: opt.id,
    label: opt.value,
  }));

  const formFieldLocationOptions = attributeRaw[1].options.map((opt) => ({
    id: opt.id,
    label: opt.value,
  }));

  await prisma.app_RoutingForms_Form.create({
    data: {
      id: seededForm.id,
      routes: [
        {
          id: seededForm.routes[0].id,
          action: {
            type: "eventTypeRedirectUrl",
            value: seededForm.routes[0].value,
            eventTypeId: seededForm.routes[0].eventTypeId,
          },
          queryValue: {
            id: "aaba9988-cdef-4012-b456-719300f53ef8",
            type: "group",
            children1: {
              "b98b98a8-0123-4456-b89a-b19300f55277": {
                type: "rule",
                properties: {
                  field: seededForm.formFieldSkills.id,
                  value: [
                    formFieldSkillsOptions.filter((opt) => opt.label === "JavaScript").map((opt) => opt.id),
                  ],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                  valueError: [null],
                },
              },
            },
          },
          attributesQueryValue: {
            id: "ab99bbb9-89ab-4cde-b012-319300f53ef8",
            type: "group",
            children1: {
              "b98b98a8-0123-4456-b89a-b19300f55277": {
                type: "rule",
                properties: {
                  field: attributeRaw[2].id,
                  value: [
                    attributeRaw[2].options.filter((opt) => opt.value === "JavaScript").map((opt) => opt.id),
                  ],
                  operator: "multiselect_some_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                  valueError: [null],
                },
              },
            },
          },
        },
        {
          id: seededForm.routes[1].id,
          action: {
            type: "eventTypeRedirectUrl",
            value: seededForm.routes[1].value,
            eventTypeId: seededForm.routes[1].eventTypeId,
          },
          queryValue: {
            id: "aaba9948-cdef-4012-b456-719300f53ef8",
            type: "group",
            children1: {
              "c98b98a8-1123-4456-e89a-a19300f55277": {
                type: "rule",
                properties: {
                  field: seededForm.formFieldSkills.id,
                  value: [formFieldSkillsOptions.filter((opt) => opt.label === "Sales").map((opt) => opt.id)],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                  valueError: [null],
                },
              },
            },
          },
          attributesQueryValue: {
            id: "ab988888-89ab-4cde-b012-319300f53ef8",
            type: "group",
            children1: {
              "b98b98a12-0123-4456-b89a-b19300f55277": {
                type: "rule",
                properties: {
                  field: attributeRaw[2].id,
                  value: [
                    attributeRaw[2].options.filter((opt) => opt.value === "Sales").map((opt) => opt.id),
                  ],
                  operator: "multiselect_some_in",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                  valueError: [null],
                },
              },
            },
          },
          fallbackAttributesQueryValue: {
            id: "a9888488-4567-489a-bcde-f19300f53ef8",
            type: "group",
          },
        },
        {
          id: "148899aa-4567-489a-bcde-f1823f708646",
          action: { type: "customPageMessage", value: "Fallback Message" },
          isFallback: true,
          queryValue: { id: "814899aa-4567-489a-bcde-f1823f708646", type: "group" },
        },
      ],
      fields: [
        {
          id: seededForm.formFieldLocation.id,
          type: "select",
          label: "Location",
          options: formFieldLocationOptions,
          required: true,
        },
        {
          id: seededForm.formFieldSkills.id,
          type: "multiselect",
          label: "skills",
          options: formFieldSkillsOptions,
          required: true,
        },
        {
          id: seededForm.formFieldEmail.id,
          type: "email",
          label: "Email",
          required: true,
        },
        {
          id: seededForm.formFieldManager.id,
          type: "text",
          label: "Manager",
          required: true,
        },
        {
          id: seededForm.formFieldRating.id,
          type: "number",
          label: "Rating",
          required: true,
        },
      ],
      team: {
        connect: {
          id: teamId,
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
      name: seededForm.name,
    },
  });
  return seededForm;
}

type SeededForm = {
  id: string;
  name: string;
  routes: {
    id: string;
    value: string;
  }[];
  formFieldLocation: {
    id: string;
  };
  formFieldSkills: {
    id: string;
  };
  formFieldEmail: {
    id: string;
  };
  formFieldManager: {
    id: string;
  };
  formFieldRating: {
    id: string;
  };
};

// id	formFillerId	formId	response	createdAt	routedToBookingUid
// 1	cm35rrf1x0001rqjskhydev9i	948ae412-d995-4865-885a-48302588de03	"{""83316968-45bf-4c9d-b5d4-5368a8d2d2a8"": {""label"": ""skills"", ""value"": [""8d841a71-3b96-4930-9e2d-57a3584ec21b""]}}"	2024-11-06 11:01:56.853

export async function seedRoutingFormResponses(
  seededForm: SeededForm,
  attributeRaw: { id: string; options: { id: string; value: string }[] }[],
  teamId: number
) {
  // Get all bookings for this team
  const bookings = await prisma.booking.findMany({
    where: {
      eventType: {
        teamId: teamId,
      },
    },
    take: 1000, // Limit to 1000 responses
    select: {
      id: true,
      uid: true,
    },
  });

  if (bookings.length === 0) {
    console.log("No bookings found for team - skipping routing form responses");
    return;
  }

  // Create routing form responses linked to random bookings
  for (const booking of bookings) {
    // Randomly select 1-3 skills from the form field options
    const numSkills = Math.floor(Math.random() * 3) + 1;
    const shuffledSkillOptions = [...attributeRaw[2].options].sort(() => Math.random() - 0.5);
    const selectedSkills = shuffledSkillOptions.slice(0, numSkills);

    const selectedLocation =
      attributeRaw[1].options[Math.floor(Math.random() * attributeRaw[1].options.length)];

    // Generate a random date within the last 30 days
    const randomDate = dayjs()
      .subtract(Math.floor(Math.random() * 30), "days")
      .subtract(Math.floor(Math.random() * 24), "hours")
      .subtract(Math.floor(Math.random() * 60), "minutes");

    // Create the form response with the routedToBookingUid field set
    const response = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: seededForm.id,
        formFillerId: randomUUID(),
        createdAt: randomDate.toDate(),
        response: {
          [seededForm.formFieldLocation.id]: {
            label: "Location",
            value: selectedLocation.id,
          },
          [seededForm.formFieldSkills.id]: {
            label: "skills",
            value: selectedSkills.map((opt) => opt.id),
          },
          [seededForm.formFieldEmail.id]: {
            label: "Email",
            value: faker.internet.email(),
          },
          [seededForm.formFieldManager.id]: {
            label: "Manager",
            value: faker.person.fullName(),
          },
          [seededForm.formFieldRating.id]: {
            label: "Rating",
            value: Math.floor(Math.random() * 5) + 1,
          },
        },
      },
    });

    // Update the response with the booking UID
    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        routedFromRoutingFormReponse: { connect: { id: response.id } },
        startTime: randomDate.toDate(),
        endTime: randomDate.add(1, "hour").toDate(),
        createdAt: randomDate.toDate(),
      },
    });

    await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: seededForm.id,
        formFillerId: randomUUID(),
        createdAt: randomDate.subtract(2, "hour").toDate(),
        response: {
          [seededForm.formFieldLocation.id]: {
            label: "Location",
            value: selectedLocation.id,
          },
          [seededForm.formFieldSkills.id]: {
            label: "skills",
            value: selectedSkills.map((opt) => opt.id),
          },
          [seededForm.formFieldEmail.id]: {
            label: "Email",
            value: faker.internet.email(),
          },
          [seededForm.formFieldManager.id]: {
            label: "Manager",
            value: faker.person.fullName(),
          },
          [seededForm.formFieldRating.id]: {
            label: "Rating",
            value: Math.floor(Math.random() * 5) + 1,
          },
        },
      },
    });
  }

  console.log(`Created ${bookings.length} routing form responses`);
}
