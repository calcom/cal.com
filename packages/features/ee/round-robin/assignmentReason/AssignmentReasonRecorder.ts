import { acrossQueryValueCompatiblity } from "@calcom/app-store/_utils/raqb/raqbUtils.server";
import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import { getUsersAttributes } from "@calcom/features/attributes/lib/getAttributes";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

const { getAttributesQueryValue } = acrossQueryValueCompatiblity;

export enum RRReassignmentType {
  ROUND_ROBIN = "round_robin",
  MANUAL = "manual",
}

export default class AssignmentReasonRecorder {
  /**
   * We should use decorators to wrap the methods with withReporting
   * but we can't don't have support for static methods in decorators
   * so this is a workaround to wrap the methods with withReporting.
   */
  static routingFormRoute = withReporting(
    AssignmentReasonRecorder._routingFormRoute,
    "AssignmentReasonRecorder.routingFormRoute"
  );
  static async _routingFormRoute({
    bookingId,
    routingFormResponseId,
    organizerId,
    teamId,
    isRerouting,
    reroutedByEmail,
  }: {
    bookingId: number;
    routingFormResponseId: number;
    organizerId: number;
    teamId: number;
    isRerouting: boolean;
    reroutedByEmail?: string | null;
  }) {
    // Get the routing form data
    const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
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

      if (!userAttribute || !attributeValue || attributeValue[0] === null) continue;

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

    const reasonEnum = isRerouting
      ? AssignmentReasonEnum.REROUTED
      : AssignmentReasonEnum.ROUTING_FORM_ROUTING;
    const reasonString = `${
      isRerouting && reroutedByEmail ? `Rerouted by ${reroutedByEmail}` : ""
    } ${attributeValues.join(", ")}`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum,
        reasonString,
      },
    });

    return {
      reasonEnum,
      reasonString,
    };
  }

  // Separate method to handle rerouting
  static CRMOwnership = withReporting(
    AssignmentReasonRecorder._CRMOwnership,
    "AssignmentReasonRecorder.CRMOwnership"
  );
  static async _CRMOwnership({
    bookingId,
    crmAppSlug,
    teamMemberEmail,
    recordType,
    routingFormResponseId,
    recordId,
  }: {
    bookingId: number;
    crmAppSlug: string;
    teamMemberEmail: string;
    recordType: string;
    routingFormResponseId: number;
    recordId?: string;
  }) {
    const appAssignmentReasonHandler = (await import("./appAssignmentReasonHandler")).default;
    const appHandler = appAssignmentReasonHandler[crmAppSlug];
    if (!appHandler) return;

    const crmRoutingReason = await appHandler({
      recordType,
      teamMemberEmail,
      routingFormResponseId,
      recordId,
    });

    if (!crmRoutingReason || !crmRoutingReason.assignmentReason) return;

    const { reasonEnum, assignmentReason } = crmRoutingReason;

    await prisma.assignmentReason.create({
      data: {
        bookingId,
        reasonEnum,
        reasonString: assignmentReason,
      },
    });

    return {
      reasonEnum,
      reasonString: assignmentReason,
    };
  }
  static roundRobinReassignment = withReporting(
    AssignmentReasonRecorder._roundRobinReassignment,
    "AssignmentReasonRecorder.roundRobinReassignment"
  );
  static async _roundRobinReassignment({
    bookingId,
    reassignById,
    reassignReason,
    reassignmentType,
  }: {
    bookingId: number;
    reassignById: number;
    reassignReason?: string;
    reassignmentType: RRReassignmentType;
  }) {
    const reassignedBy = await prisma.user.findUnique({
      where: {
        id: reassignById,
      },
      select: {
        username: true,
      },
    });

    const reasonEnum =
      reassignmentType === RRReassignmentType.MANUAL
        ? AssignmentReasonEnum.REASSIGNED
        : AssignmentReasonEnum.RR_REASSIGNED;

    const reasonString = `Reassigned by: ${reassignedBy?.username || "team member"}. ${
      reassignReason ? `Reason: ${reassignReason}` : ""
    }`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum,
        reasonString,
      },
    });

    return {
      reasonEnum,
      reasonString,
    };
  }
}
