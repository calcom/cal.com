import { CredentialRepository } from "../../../lib/server/repository/credential";
import { EventTypeService } from "../../../lib/server/service/eventType";
import type { AttributeRoutingConfig } from "../../routing-forms/types/types";
import SalesforceCRMService from "./CrmService";
import { SalesforceRecordEnum, RoutingReasons } from "./enums";

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
    return { email: null, recordType: null };

  const appData = await EventTypeService.getEventTypeAppDataFromId(eventTypeId, "salesforce");

  const credentialId = appData.credentialId;

  const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: credentialId });

  if (!credential) return { email: null, recordType: null };

  const crm = new SalesforceCRMService(credential, {});

  const userLookupEmail = await crm.findUserEmailFromLookupField(
    attendeeEmail,
    salesforceSettings.rrSKipToAccountLookupFieldName,
    SalesforceRecordEnum.ACCOUNT
  );

  return { email: userLookupEmail?.email ?? null, recordType: RoutingReasons.ACCOUNT_LOOKUP_FIELD as string };
};

export default routingFormBookingFormHandler;
