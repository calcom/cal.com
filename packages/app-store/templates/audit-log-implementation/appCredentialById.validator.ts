import { z } from "zod";

import { Credential } from "../../_utils/zod";
import { appKeysSchema } from "./zod";

function truncateString(str: string) {
  const halfLength = Math.floor(str.length / 2);
  const start = str.slice(0, halfLength);
  const end = str.slice(-halfLength);
  return `${start}...${end}`;
}
const getClientSafeAppCredential = Credential.extend({
  key: appKeysSchema
    .omit({ apiKey: true })
    .extend({ apiKey: z.string().transform((apiKey) => truncateString(apiKey)) }),
});

export default getClientSafeAppCredential;
