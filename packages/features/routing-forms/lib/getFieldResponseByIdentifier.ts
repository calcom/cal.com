import { parseRoutingFormResponse } from "./parseRoutingFormResponse";
import { findFieldValueByIdentifier } from "./findFieldValueByIdentifier";

export const getFieldResponseByIdentifier = ({
  responsePayload,
  formFields,
  identifier,
}: {
  responsePayload: unknown;
  formFields: unknown;
  identifier: string;
}) => {
  const parsedResponse = parseRoutingFormResponse(responsePayload, formFields);
  const emailFieldResult = findFieldValueByIdentifier(parsedResponse, identifier);
  return emailFieldResult;
};
