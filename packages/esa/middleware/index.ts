import { label } from "next-api-middleware";

import { addRequestId } from "../lib/helpers/addRequestid";
import { customPrismaClient } from "../lib/helpers/customPrisma";
import { verifyCrmToken } from "./verifyCrmToken";
import { verifyManagedSetupCompletionToken } from "./verifyManagedSetupCompletionToken";

const middleware = {
  customPrismaClient,
  addRequestId,
  verifyCrmToken,
  verifyManagedSetupCompletionToken,
};

export const withMiddleware = label(middleware, ["customPrismaClient", "addRequestId"]);
