import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { appKeysSchema } from "../zod";

export const getRazorpayAppKeys = () => getParsedAppKeysFromSlug("razorpay", appKeysSchema);