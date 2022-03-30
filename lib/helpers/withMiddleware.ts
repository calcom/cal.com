import { label } from "next-api-middleware";

import { addRequestId } from "./addRequestid";
import { captureErrors } from "./captureErrors";
import { HTTP_POST, HTTP_DELETE, HTTP_PATCH, HTTP_GET, httpMethod } from "./httpMethods";
import { verifyApiKey } from "./verifyApiKey";

const withMiddleware = label(
  {
    HTTP_GET,
    HTTP_PATCH,
    HTTP_POST,
    HTTP_DELETE,
    addRequestId,
    verifyApiKey,
    sentry: captureErrors,
    httpMethod: httpMethod("GET" || "DELETE" || "PATCH" || "POST"),
  },
  ["sentry", "verifyApiKey", "httpMethod", "addRequestId"] // <-- Provide a list of middleware to call automatically
);

export { withMiddleware };
