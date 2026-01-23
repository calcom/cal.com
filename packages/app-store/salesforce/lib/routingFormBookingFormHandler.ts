import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

import type { AttributeRoutingConfig } from "../../routing-forms/types/types";
import { createSalesforceCrmServiceWithSalesforceType } from "./CrmService";
import { SalesforceRecordEnum, RoutingReasons } from "./enums";
import { EventTypeService } from "./eventTypeService";

const routingFormBookingFormHandler = async (
  attendeeEmail: string,
  attributeRoutingConfig: AttributeRoutingConfig,
  eventTypeId: number
) => {
  const salesforceSettings = attributeRoutingConfig?.salesforce;

  if (
    !salesforceSettings ||
    !salesforceSettings.rrSkipToAccountLookupField ||
    !salesforceSettings.rrSKipToAccountLookupFieldName
  )
    return { email: null, recordType: null, recordId: null };

  const appData = await EventTypeService.getEventTypeAppDataFromId(eventTypeId, "salesforce");

  const credentialId = appData.credentialId;

  const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: credentialId });

  if (!credential) return { email: null, recordType: null, recordId: null };

  const crm = createSalesforceCrmServiceWithSalesforceType(credential, {});

  const userLookupEmail = await crm.findUserEmailFromLookupField(
    attendeeEmail,
    salesforceSettings.rrSKipToAccountLookupFieldName,
    SalesforceRecordEnum.ACCOUNT
  );

  return {
    email: userLookupEmail?.email ?? null,
    recordType: RoutingReasons.ACCOUNT_LOOKUP_FIELD as string,
    recordId: null,
  };
};

export default routingFormBookingFormHandler;
