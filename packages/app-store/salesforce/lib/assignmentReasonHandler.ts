import { zodRoutes } from "@calcom/app-store/routing-forms/zod";
import prisma from "@calcom/prisma";
import { AssignmentReasonEnum } from "@calcom/prisma/enums";

import { RoutingReasons, SalesforceRecordEnum } from "./enums";

export async function assignmentReasonHandler({
  recordType,
  teamMemberEmail,
  routingFormResponseId,
}: {
  recordType: string;
  teamMemberEmail: string;
  routingFormResponseId: number;
}) {
  const returnObject = { reasonEnum: AssignmentReasonEnum.SALESFORCE_ASSIGNMENT };

  switch (recordType) {
    case SalesforceRecordEnum.CONTACT:
      return { ...returnObject, assignmentReason: `Salesforce contact owner: ${teamMemberEmail}` };
    case SalesforceRecordEnum.LEAD:
      return { ...returnObject, assignmentReason: `Salesforce lead owner: ${teamMemberEmail}` };
    case SalesforceRecordEnum.ACCOUNT:
      return { ...returnObject, assignmentReason: `Salesforce account owner: ${teamMemberEmail}` };
    case RoutingReasons.ACCOUNT_LOOKUP_FIELD:
      const assignmentReason = await handleAccountLookupFieldReason(routingFormResponseId, teamMemberEmail);
      return { ...returnObject, assignmentReason };
  }
}

async function handleAccountLookupFieldReason(routingFormResponseId: number, teamMemberEmail: string) {
  const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
    where: {
      id: routingFormResponseId,
    },
    select: {
      chosenRouteId: true,
      form: {
        select: {
          routes: true,
        },
      },
    },
  });

  if (!routingFormResponse) return;

  const { form } = routingFormResponse;
  if (!form.routes) return;

  const parsedRoutes = zodRoutes.safeParse(form.routes);

  if (!parsedRoutes.success || !parsedRoutes.data) return;

  const chosenRouteId = routingFormResponse.chosenRouteId;

  const takenRoute = parsedRoutes.data.find((route) => route.id === chosenRouteId);

  if (!takenRoute || !("attributeRoutingConfig" in takenRoute)) return;

  const attributeRoutingConfig = takenRoute?.attributeRoutingConfig;

  if (!attributeRoutingConfig) return;

  const salesforceConfig = attributeRoutingConfig["salesforce"];

  const accountLookupFieldName = salesforceConfig?.rrSKipToAccountLookupFieldName;

  return accountLookupFieldName
    ? `Salesforce account lookup field: ${accountLookupFieldName} - ${teamMemberEmail}`
    : undefined;
}
