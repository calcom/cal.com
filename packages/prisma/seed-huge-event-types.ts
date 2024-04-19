/**
 *  This script can be used to seed the database with a lot of data for performance testing.
 *  TODO: Make it more structured and configurable from CLI
 *  Run it as `npx ts-node --transpile-only ./seed-huge-event-types.ts`
 */
import { createTeamAndAddUsers, createUserAndEventType } from "./seed-utils";

const getEventTypes = (numberOfEventTypes: number) => {
  const eventTypes = Array<{
    title: string;
    slug: string;
    length: number;
  }>(numberOfEventTypes)
    .fill({
      title: "30min",
      slug: "30min",
      length: 30,
    })
    .map((event, index) => {
      return {
        ...event,
        title: `30min-${index}`,
        slug: `30min-${index}`,
      };
    });
  return eventTypes;
};

async function createTeamsWithEventTypes({
  owner,
  numberOfTeams,
  numberOfEventTypes,
}: {
  owner: { id: number; username: string | null };
  numberOfTeams: number;
  numberOfEventTypes: number;
}) {
  const members = [owner];
  for (let i = 0; i < 10; i++) {
    members.push(
      await createUserAndEventType({
        user: {
          email: `enterprise-member-${i + 1}@example.com`,
          name: `Enterprise Member ${i + 1}`,
          password: `enterprise-member-${i + 1}`,
          username: `enterprise-member-${i + 1}`,
          theme: "light",
        },
      })
    );
  }

  for (let i = 0; i < numberOfTeams; i++) {
    await createTeamAndAddUsers(
      {
        name: `Enterprise Team-${i + 1}`,
        slug: `enterprise-team-${i + 1}`,
        eventTypes: {
          createMany: {
            data: getEventTypes(numberOfEventTypes).map((eventType) => {
              return {
                ...eventType,
                schedulingType: "COLLECTIVE",
              };
            }),
          },
        },
        createdAt: new Date(),
      },
      members.map((member) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        username: member.username!,
        id: member.id,
      }))
    );
  }
}

export default async function main() {
  const owner = await createUserAndEventType({
    user: {
      email: `enterprise@example.com`,
      name: "Enterprise Owner",
      password: "enterprise",
      username: `enterprise`,
      theme: "light",
    },
    eventTypes: getEventTypes(100),
  });
  await createTeamsWithEventTypes({ owner, numberOfTeams: 10, numberOfEventTypes: 100 });
}
