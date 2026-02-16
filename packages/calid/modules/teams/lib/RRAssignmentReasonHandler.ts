import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";


import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import { acrossQueryValueCompatiblity } from "@calcom/lib/raqb/raqbUtils";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { getUsersAttributes } from "@calcom/lib/service/attribute/server/getAttributes";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";
import { assignmentReasonHandler as salesforceAssignmentReasonHandler } from "@calcom/app-store/salesforce/lib/assignmentReasonHandler";

type AppAssignmentReasonHandler = ({
  recordType,
  teamMemberEmail,
  routingFormResponseId,
  recordId,
}: {
  recordType: string;
  teamMemberEmail: string;
  routingFormResponseId: number;
  recordId?: string;
}) => Promise<{ assignmentReason: string | undefined; reasonEnum: AssignmentReasonEnum } | undefined>;

const appBookingFormHandler: Record<string, AppAssignmentReasonHandler> = {
  salesforce: salesforceAssignmentReasonHandler,
};

const { getAttributesQueryValue } = acrossQueryValueCompatiblity;

export enum RRReassignmentType {
  ROUND_ROBIN = "round_robin",
  MANUAL = "manual",
}

export default class AssignmentReasonHandler {
  static routingFormRoute = withReporting(
    AssignmentReasonHandler._routingFormRoute,
    "AssignmentReasonHandler.routingFormRoute"
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
    const formResponseRecord = await prisma.app_RoutingForms_FormResponse.findUnique({
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

    if (!formResponseRecord) return;

    const { form: formData } = formResponseRecord;
    
    if (!formData.routes || !formData.fields) return;

    const routesValidation = zodRoutes.safeParse(formData.routes);

    if (!routesValidation.success || !routesValidation.data) return;

    const selectedRouteIdentifier = formResponseRecord.chosenRouteId;

    const matchingRoute = routesValidation.data.find((routeEntry) => routeEntry.id === selectedRouteIdentifier);

    if (!matchingRoute) return;

    const organizerAttributes = await getUsersAttributes({ userId: organizerId, teamId });

    if (!("attributesQueryValue" in matchingRoute)) return;

    const routeAttributeQuery = matchingRoute.attributesQueryValue;

    const computedAttributeQuery = getAttributesQueryValue({
      attributesQueryValue: routeAttributeQuery,
      attributes: organizerAttributes,
      dynamicFieldValueOperands: {
        fields: (formData.fields as Fields) || [],
        response: formResponseRecord.response as FormResponse,
      },
    });

    if (!computedAttributeQuery) return;

    const routingAttributes = computedAttributeQuery.children1;

    if (!routingAttributes) return;

    const collectedAttributeValues: string[] = [];

    for (const attributeKey of Object.keys(routingAttributes)) {
      const attributeProperties = routingAttributes[attributeKey].properties;

      if (!attributeProperties) continue;

      const matchingUserAttribute = organizerAttributes.find(
        (attr) => attributeProperties.field === attr.id
      );

      const extractedValue = attributeProperties.value;

      if (!matchingUserAttribute || !extractedValue || typeof extractedValue[0] === null) continue;

      if (extractedValue && extractedValue[0]) {
        const stringifiedValue = (() => {
          if (Array.isArray(extractedValue[0])) {
            return extractedValue[0][0];
          } else {
            return extractedValue[0];
          }
        })();

        collectedAttributeValues.push(`${matchingUserAttribute?.name}: ${stringifiedValue}`);
      }
    }

    const assignmentType = isRerouting
      ? AssignmentReasonEnum.REROUTED
      : AssignmentReasonEnum.ROUTING_FORM_ROUTING;
    
    const reroutePrefix = isRerouting && reroutedByEmail ? `Rerouted by ${reroutedByEmail}` : "";
    const assignmentDescription = `${reroutePrefix} ${collectedAttributeValues.join(", ")}`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: assignmentType,
        reasonString: assignmentDescription,
      },
    });

    return {
      reasonEnum: assignmentType,
      reasonString: assignmentDescription,
    };
  }

  static CRMOwnership = withReporting(
    AssignmentReasonHandler._CRMOwnership,
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
    const handlerForApp = appBookingFormHandler[crmAppSlug];
    
    if (!handlerForApp) return;

    const crmAssignmentData = await handlerForApp({
      recordType,
      teamMemberEmail,
      routingFormResponseId,
      recordId,
    });

    if (!crmAssignmentData?.assignmentReason) return;

    const { reasonEnum: assignmentCategory, assignmentReason: assignmentExplanation } = crmAssignmentData;

    await prisma.assignmentReason.create({
      data: {
        bookingId,
        reasonEnum: assignmentCategory,
        reasonString: assignmentExplanation,
      },
    });

    return {
      reasonEnum: assignmentCategory,
      reasonString: assignmentExplanation,
    };
  }

  static roundRobinReassignment = withReporting(
    AssignmentReasonHandler._roundRobinReassignment,
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
    const initiatingUser = await prisma.user.findUnique({
      where: {
        id: reassignById,
      },
      select: {
        username: true,
      },
    });

    const isManualReassignment = reassignmentType === RRReassignmentType.MANUAL;
    
    const assignmentCategory = isManualReassignment
      ? AssignmentReasonEnum.REASSIGNED
      : AssignmentReasonEnum.RR_REASSIGNED;

    const initiatorName = initiatingUser?.username || "team member";
    const reasonSuffix = reassignReason ? `Reason: ${reassignReason}` : "";
    const assignmentExplanation = `Reassigned by: ${initiatorName}. ${reasonSuffix}`;

    await prisma.assignmentReason.create({
      data: {
        bookingId: bookingId,
        reasonEnum: assignmentCategory,
        reasonString: assignmentExplanation,
      },
    });

    return {
      reasonEnum: assignmentCategory,
      reasonString: assignmentExplanation,
    };
  }
}