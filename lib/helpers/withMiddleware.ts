import { label } from "next-api-middleware";
import { addRequestId } from "./addRequestid";
import { captureErrors } from "./captureErrors";
import { verifyApiKey } from "./verifyApiKey";
import { postOnly, deleteOnly, patchOnly, getOnly } from "./httpMethods";
const withMiddleware = label(
  {
    getOnly,
    patchOnly,
    postOnly,
    deleteOnly,
    addRequestId,
    verifyApiKey,
    sentry: captureErrors, // <-- Optionally alias middleware
  },
  ["sentry","verifyApiKey"] // <-- Provide a list of middleware to call automatically
);

export { withMiddleware };