import { getUsersAttributes } from "@calcom/app-store/routing-forms/lib/getAttributes";
import { acrossQueryValueCompatiblity } from "@calcom/app-store/routing-forms/lib/raqbUtils";
import { getFieldResponse } from "@calcom/app-store/routing-forms/trpc/utils";
import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
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
    if (!form.routes) return;

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
      response: routingFormResponse.response as FormResponse,
      fields: routingFormResponse.form.fields as Fields,
      getFieldResponse,
    });

    if (!attributesQueryValue) return;

    const attributesUsedToRoute = attributesQueryValue.children1;

    const attributeValues: string[] = [];

    Object.keys(attributesUsedToRoute).map((att) => {
      const attributeToFilter = attributesUsedToRoute[att].properties;

      const userAttribute = usersAttributes.find((attribute) => attributeToFilter.field === attribute.id);

      const attributeValue = attributeToFilter.value;

      attributeValues.push(`${userAttribute?.name}: ${attributeValue[0][0]}`);
    });

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: AssignmentReasonEnum.ROUTING_FORM_ROUTING,
        reasonString: attributeValues.join(", "),
      },
    });
  }

  // Separate method to handle rerouting

  // Routing via CRM ownership, need to keep each specific CRM logic in it's own package

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
