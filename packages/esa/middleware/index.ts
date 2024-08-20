import { label } from "next-api-middleware";

import { addRequestId } from "@calcom/api/lib/helpers/addRequestid";
import { customPrismaClient } from "@calcom/api/lib/helpers/customPrisma";

import { verifyCrmToken } from "./verifyCrmToken";
import { verifyManagedSetupCompletionToken } from "./verifyManagedSetupCompletionToken";

const middleware = {
  customPrismaClient,
  addRequestId,
  verifyCrmToken,
  verifyManagedSetupCompletionToken,
};

export const withMiddleware = label(middleware, ["customPrismaClient", "addRequestId"]);
