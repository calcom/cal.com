import logger from "@calcom/lib/logger";

import { CredentialRepository } from "../../../../lib/server/repository/credential";
import { routingFormIncompleteBookingDataSchema } from "../../zod";
import SalesforceCRMService from "../CrmService";

const log = logger.getSubLogger({ prefix: ["incomplete-booking: salesforce"] });

export const incompleteBookingAction = async (action: any, email: string) => {
  const dataParse = routingFormIncompleteBookingDataSchema.safeParse(action.data);

  if (!dataParse.success) {
    log.error(`Incomplete booking action data is not valid: ${dataParse.error}`);
    return;
  }

  const { writeToRecordObject } = dataParse.data;

  const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: action.credentialId });

  if (!credential) {
    log.error(`Credential with id ${action.credentialId} not found`);
    return;
  }

  if (writeToRecordObject) {
    const crm = new SalesforceCRMService(credential, {});

    await crm.incompleteBookingWriteToRecord(email, writeToRecordObject);
  }

  return;
};
