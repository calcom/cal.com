import getParsedAppKeysFromSlug from "@calcom/app-store-core/_utils/getParsedAppKeysFromSlug";

import { appKeysSchema } from "../zod";

export const getStripeAppKeys = () => getParsedAppKeysFromSlug("stripe", appKeysSchema);
