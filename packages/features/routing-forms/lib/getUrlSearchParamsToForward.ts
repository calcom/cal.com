import { ROUTING_FORM_RESPONSE_ID_QUERY_STRING } from "@calcom/app-store/routing-forms/lib/constants";
import getFieldIdentifier from "@calcom/app-store/routing-forms/lib/getFieldIdentifier";
import type { FormResponse, LocalRoute } from "@calcom/app-store/routing-forms/types/types";

type FormResponseValueOnly = { [key: string]: { value: FormResponse[keyof FormResponse]["value"] } };

type AttributeRoutingConfig = NonNullable<LocalRoute["attributeRoutingConfig"]>;
type GetUrlSearchParamsToForwardOptions = {
  formResponse: Record<
    string,
    {
      value: number | string | string[];
    }
  >;
  fields: {
    id: string;
    type: string;
    label: string;
    options?: {
      id: string | null;
      label: string;
    }[];
    identifier?: string;
  }[];
  searchParams: URLSearchParams;
  formResponseId: number | null;
  queuedFormResponseId: string | null;
  teamMembersMatchingAttributeLogic: number[] | null;
  attributeRoutingConfig: AttributeRoutingConfig | null;
  crmContactOwnerEmail?: string | null;
  crmContactOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmLookupDone?: boolean;
  reroutingFormResponses?: FormResponseValueOnly;
  teamId?: number | null;
  orgId?: number | null;
};

export function getUrlSearchParamsToForward({
  formResponse,
  fields,
  searchParams,
  teamMembersMatchingAttributeLogic,
  formResponseId,
  queuedFormResponseId,
  attributeRoutingConfig,
  crmContactOwnerEmail,
  crmContactOwnerRecordType,
  crmAppSlug,
  crmLookupDone,
  reroutingFormResponses,
  teamId,
  orgId,
}: GetUrlSearchParamsToForwardOptions) {
  type Params = Record<string, string | string[]>;
  const paramsFromResponse: Params = {};
  const paramsFromCurrentUrl: Params = {};

  // Build query params from response
  Object.entries(formResponse).forEach(([key, fieldResponse]) => {
    const foundField = fields.find((f) => f.id === key);
    if (!foundField) {
      // If for some reason, the field isn't there, let's just
      return;
    }
    let valueAsStringOrStringArray =
      typeof fieldResponse.value === "number" ? String(fieldResponse.value) : fieldResponse.value;
    if (foundField.type === "select" || foundField.type === "multiselect") {
      const options = foundField.options || [];
      let arr =
        valueAsStringOrStringArray instanceof Array
          ? valueAsStringOrStringArray
          : [valueAsStringOrStringArray];
      arr = arr.map((idOrLabel) => {
        const foundOptionById = options.find((option) => {
          return option.id === idOrLabel;
        });
        if (foundOptionById) {
          return foundOptionById.label;
        }
        return idOrLabel;
      });
      valueAsStringOrStringArray = foundField.type === "select" ? arr[0] : arr;
    }
    paramsFromResponse[getFieldIdentifier(foundField) as keyof typeof paramsFromResponse] =
      valueAsStringOrStringArray;
  });

  // Build query params from current URL. It excludes route params
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  for (const [name, value] of searchParams.entries()) {
    const target = paramsFromCurrentUrl[name];
    if (target instanceof Array) {
      target.push(value);
    } else {
      paramsFromCurrentUrl[name] = [value];
    }
  }

  const attributeRoutingConfigParams: Record<string, any> = {};

  if (attributeRoutingConfig) {
    for (const key of Object.keys(attributeRoutingConfig)) {
      if (key === "skipContactOwner" && attributeRoutingConfig[key]) {
        attributeRoutingConfigParams["cal.skipContactOwner"] = "true";
      }

      // TODO: How do we move this logic to their respective app packages
      if (key === "salesforce") {
        const salesforceData = attributeRoutingConfig[key];

        if (salesforceData?.rrSkipToAccountLookupField && salesforceData.rrSKipToAccountLookupFieldName) {
          attributeRoutingConfigParams["cal.salesforce.rrSkipToAccountLookupField"] = "true";
        }
      }
    }
  }

  const allQueryParams: Params = {
    ...(teamId && { ["cal.teamId"]: `${teamId}` }),
    ...(orgId && { ["cal.orgId"]: `${orgId}` }),
    ...paramsFromCurrentUrl,
    // In case of conflict b/w paramsFromResponse and paramsFromCurrentUrl, paramsFromResponse should win as the booker probably improved upon the prefilled value.
    ...paramsFromResponse,
    ...(teamMembersMatchingAttributeLogic
      ? { ["cal.routedTeamMemberIds"]: teamMembersMatchingAttributeLogic.join(",") }
      : null),
    ...(typeof formResponseId === "number"
      ? { [ROUTING_FORM_RESPONSE_ID_QUERY_STRING]: String(formResponseId) }
      : null),
    ...(queuedFormResponseId ? { ["cal.queuedFormResponseId"]: queuedFormResponseId } : null),
    ...attributeRoutingConfigParams,
    ...(crmContactOwnerEmail ? { ["cal.crmContactOwnerEmail"]: crmContactOwnerEmail } : null),
    ...(crmContactOwnerRecordType ? { ["cal.crmContactOwnerRecordType"]: crmContactOwnerRecordType } : null),
    ...(crmAppSlug ? { ["cal.crmAppSlug"]: crmAppSlug } : null),
    ...(crmLookupDone ? { ["cal.crmLookupDone"]: "true" } : null),
    ...(reroutingFormResponses
      ? { ["cal.reroutingFormResponses"]: JSON.stringify(reroutingFormResponses) }
      : null),
  };

  const allQueryURLSearchParams = new URLSearchParams();

  // Make serializable URLSearchParams instance
  Object.entries(allQueryParams).forEach(([param, value]) => {
    const valueArray = value instanceof Array ? value : [value];
    valueArray.forEach((v) => {
      allQueryURLSearchParams.append(param, v);
    });
  });

  return allQueryURLSearchParams;
}

export function getUrlSearchParamsToForwardForReroute({
  formResponse,
  formResponseId,
  fields,
  searchParams,
  teamMembersMatchingAttributeLogic,
  attributeRoutingConfig,
  rescheduleUid,
  reroutingFormResponses,
}: Omit<GetUrlSearchParamsToForwardOptions, "queuedFormResponseId"> & {
  rescheduleUid: string;
  reroutingFormResponses: FormResponseValueOnly;
}) {
  searchParams.set("rescheduleUid", rescheduleUid);
  searchParams.set("cal.rerouting", "true");
  return getUrlSearchParamsToForward({
    formResponse,
    formResponseId,
    // Queued form response id is not available in rerouting
    queuedFormResponseId: null,
    fields,
    searchParams,
    teamMembersMatchingAttributeLogic,
    attributeRoutingConfig,
    reroutingFormResponses,
  });
}

export function getUrlSearchParamsToForwardForTestPreview({
  formResponse,
  fields,
  attributeRoutingConfig,
  teamMembersMatchingAttributeLogic,
}: Pick<
  GetUrlSearchParamsToForwardOptions,
  "formResponse" | "fields" | "attributeRoutingConfig" | "teamMembersMatchingAttributeLogic"
>) {
  // There are no existing query params to forward in test preview. These are available only when doing the actual form submission
  const searchParams = new URLSearchParams();
  searchParams.set("cal.isTestPreviewLink", "true");
  return getUrlSearchParamsToForward({
    formResponse,
    fields,
    attributeRoutingConfig,
    teamMembersMatchingAttributeLogic,
    // There is no form response being stored in test preview
    formResponseId: null,
    // Queued form response id is not available in test preview
    queuedFormResponseId: null,
    searchParams,
  });
}
