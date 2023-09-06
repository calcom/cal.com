import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import appConfig from "../config.json";
import { appKeysSchema } from "../zod";

export const getMercadoPagoAppKeys = () => getParsedAppKeysFromSlug(appConfig.slug, appKeysSchema);
