import { readonlyPrisma as prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";
import { zodRoutes } from "@calcom/routing-forms/zod";

class VirtualQueuesInsights {
  static async getUserRelevantTeamRoutingForms({ userId }: { userId: number }) {
    const teamRoutingForms = await prisma.app_RoutingForms_Form.findMany({
      where: {
        team: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        team: {
          select: {
            parentId: true,
            parent: {
              select: {
                slug: true,
              },
            },
            metadata: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            movedToProfileId: true,
          },
        },
      },
    });

    const serializableForms = await Promise.all(
      teamRoutingForms.map(async (form) => {
        const serializedForm = await getSerializableForm({ form });
        return {
          ...serializedForm, // Data from getSerializableForm
          team: form.team,
        };
      })
    );
    // find routing forms that link to RR event type
    const formsRedirectingToWeightedRR = [];

    for (const form of serializableForms) {
      const routes = zodRoutes.parse(form.routes);
      if (!routes) continue;

      for (const route of routes) {
        if ("action" in route) {
          const eventType = await prisma.eventType.findFirst({
            where: {
              id: route.action.eventTypeId,
              hosts: {
                some: {
                  userId,
                },
              },
              schedulingType: SchedulingType.ROUND_ROBIN,
              isRRWeightsEnabled: true,
            },
          });
          if (eventType) {
            formsRedirectingToWeightedRR.push(form);
            break;
          }
        }
      }
    }

    return formsRedirectingToWeightedRR;
  }
}

export { VirtualQueuesInsights };
