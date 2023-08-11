import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getSlackAppKeys = () => getParsedAppKeysFromSlug("slack", appKeysSchema);
