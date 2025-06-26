"use server";

import { revalidatePath } from "next/cache";

import prisma from "@calcom/prisma";

export async function revalidateEventTypeEditPage(id: number) {
  revalidatePath(`/event-types/${id}`);

  await revalidateTeamEventPages(id);
}

async function revalidateTeamEventPages(eventTypeId: number) {
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    include: {
      team: {
        select: {
          slug: true,
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (eventType?.team) {
    const teamSlug = eventType.team.slug;
    const orgSlug = eventType.team.parent?.slug;

    revalidatePath(`/team/${teamSlug}/${eventType.slug}`);

    if (orgSlug) {
      revalidatePath(`/org/${orgSlug}/team/${teamSlug}/${eventType.slug}`);
    }
  }
}
