import {
  APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME,
} from "@calcom/lib/constants";

import { invalidateCredential } from "../invalidateCredential";
import { getTokenObjectFromCredential } from "./getTokenObjectFromCredential";
import { markTokenAsExpired } from "./markTokenAsExpired";
import { updateTokenObject } from "./updateTokenObject";

export const credentialSyncVariables = {
  APP_CREDENTIAL_SHARING_ENABLED: APP_CREDENTIAL_SHARING_ENABLED,
  CREDENTIAL_SYNC_ENDPOINT: CREDENTIAL_SYNC_ENDPOINT,
  CREDENTIAL_SYNC_SECRET: CREDENTIAL_SYNC_SECRET,
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: CREDENTIAL_SYNC_SECRET_HEADER_NAME,
};

export const oAuthManagerHelper = {
  updateTokenObject,
  markTokenAsExpired,
  invalidateCredential: invalidateCredential,
  getTokenObjectFromCredential,
  credentialSyncVariables,
};
