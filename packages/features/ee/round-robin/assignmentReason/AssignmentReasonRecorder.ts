import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import { acrossQueryValueCompatiblity } from "@calcom/lib/raqb/raqbUtils";
import { getUsersAttributes } from "@calcom/lib/service/attribute/server/getAttributes";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

const { getAttributesQueryValue } = acrossQueryValueCompatiblity;

export default class AssignmentReasonRecorder {
  static async routingFormRoute({
    bookingId,
    routingFormResponseId,
    organizerId,
    teamId,
  }: {
    bookingId: number;
    routingFormResponseId: number;
    organizerId: number;
    teamId: number;
  }) {
    // Get the routing form data
    const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
      where: {
        id: routingFormResponseId,
      },
      include: {
        form: {
          select: {
            routes: true,
            fields: true,
          },
        },
      },
    });

    if (!routingFormResponse) return;
    // Figure out which route was called
    const { form } = routingFormResponse;
    if (!form.routes || !form.fields) return;

    const parsedRoutes = zodRoutes.safeParse(form.routes);

    if (!parsedRoutes.success || !parsedRoutes.data) return;

    const chosenRouteId = routingFormResponse.chosenRouteId;

    const takenRoute = parsedRoutes.data.find((route) => route.id === chosenRouteId);

    if (!takenRoute) return;

    // Get a user's attributes
    const usersAttributes = await getUsersAttributes({ userId: organizerId, teamId });

    if (!("attributesQueryValue" in takenRoute)) return;

    const formAttributesQuery = takenRoute.attributesQueryValue;

    // Figure out the attributes associated with that route
    const attributesQueryValue = getAttributesQueryValue({
      attributesQueryValue: formAttributesQuery,
      attributes: usersAttributes,
      dynamicFieldValueOperands: {
        fields: (form.fields as Fields) || [],
        response: routingFormResponse.response as FormResponse,
      },
    });

    if (!attributesQueryValue) return;

    const attributesUsedToRoute = attributesQueryValue.children1;

    if (!attributesUsedToRoute) return;

    const attributeValues: string[] = [];

    for (const attribute of Object.keys(attributesUsedToRoute)) {
      const attributeToFilter = attributesUsedToRoute[attribute].properties;

      if (!attributeToFilter) continue;

      const userAttribute = usersAttributes.find((attribute) => attributeToFilter.field === attribute.id);

      const attributeValue = attributeToFilter.value;

      if (!userAttribute || !attributeValue || typeof attributeValue[0] === null) continue;

      if (attributeValue && attributeValue[0]) {
        const attributeValueString = (() => {
          if (Array.isArray(attributeValue[0])) {
            return attributeValue[0][0];
          } else {
            return attributeValue[0];
          }
        })();

        attributeValues.push(`${userAttribute?.name}: ${attributeValueString}`);
      }
    }

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
        reasonString: attributeValues.join(", "),
      },
    });
  }

  // Separate method to handle rerouting

  static async CRMOwnership({
    bookingId,
    crmAppSlug,
    teamMemberEmail,
    recordType,
    routingFormResponseId,
  }: {
    bookingId: number;
    crmAppSlug: string;
    teamMemberEmail: string;
    recordType: string;
    routingFormResponseId: number;
  }) {
    const appAssignmentReasonHandler = (await import("./appAssignmentReasonHandler")).default;
    const appHandler = appAssignmentReasonHandler[crmAppSlug];
    if (!appHandler) return;

    const crmRoutingReason = await appHandler({ recordType, teamMemberEmail, routingFormResponseId });

    if (!crmRoutingReason || !crmRoutingReason.assignmentReason) return;

    await prisma.assignmentReason.create({
      data: {
        bookingId,
        reasonEnum: crmRoutingReason.reasonEnum,
        reasonString: crmRoutingReason.assignmentReason,
      },
    });
  }

  static async roundRobinReassignment({
    bookingId,
    reassignById,
    reassignReason,
  }: {
    bookingId: number;
    reassignById: number;
    reassignReason?: string;
  }) {
    const reassignedBy = await prisma.user.findFirst({
      where: {
        id: reassignById,
      },
      select: {
        username: true,
      },
    });

    const reasonString = `Reassigned by: ${reassignedBy?.username || "team member"}. ${
      reassignReason ? `Reason: ${reassignReason}` : ""
    }`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: AssignmentReasonEnum.REASSIGNED,
        reasonString,
      },
    });
  }
}
