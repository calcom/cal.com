import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getStripeAppKeys = () => getParsedAppKeysFromSlug("stripe", appKeysSchema);
