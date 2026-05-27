import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";

async function getBigBlueButtonAppKeys() {
  const appKeys = await getAppKeysFromSlug(metadata.slug);
  const bbbUrl = (appKeys.bbb_url as string) || "";
  const bbbSecret = (appKeys.bbb_secret as string) || "";
  return { bbbUrl, bbbSecret };
}

export default getBigBlueButtonAppKeys;
