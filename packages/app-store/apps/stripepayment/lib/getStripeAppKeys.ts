import getParsedAppKeysFromSlug from "@calcom/app-store/src/_utils/getParsedAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getStripeAppKeys = () => getParsedAppKeysFromSlug("stripe", appKeysSchema);
