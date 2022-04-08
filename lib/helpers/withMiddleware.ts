import { label } from "next-api-middleware";

import { addRequestId } from "./addRequestid";
import { captureErrors } from "./captureErrors";
import {
  HTTP_POST,
  HTTP_DELETE,
  HTTP_PATCH,
  HTTP_GET,
  HTTP_GET_OR_POST,
  HTTP_GET_DELETE_PATCH,
} from "./httpMethods";
import { verifyApiKey } from "./verifyApiKey";

const withMiddleware = label(
  {
    HTTP_GET_OR_POST,
    HTTP_GET_DELETE_PATCH,
    HTTP_GET,
    HTTP_PATCH,
    HTTP_POST,
    HTTP_DELETE,
    addRequestId,
    verifyApiKey,
    sentry: captureErrors,
  },
  ["sentry", "verifyApiKey", "addRequestId"] // <-- Provide a list of middleware to call automatically
);

export { withMiddleware };
