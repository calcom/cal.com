import { WEBSITE_URL } from "@calcom/lib/constants";

// biome-ignore lint/style/useNodejsImportProtocol: No node env
import { stringify } from "querystring";

export type Maybe<T> = T | undefined | null;

export function createPaymentLink(opts: {
  paymentUid: string;
  name?: Maybe<string>;
  date?: Maybe<string>;
  email?: Maybe<string>;
  absolute?: boolean;
}): string {
  const { paymentUid, name, email, date, absolute = true } = opts;
  let link = "";
  if (absolute) link = WEBSITE_URL;
  const query = stringify({ date, name, email });
  return `${link}/payment/${paymentUid}?${query}`;
}
