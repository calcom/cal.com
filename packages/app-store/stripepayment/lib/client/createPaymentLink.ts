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
  if (absolute) link = process.env.NEXT_PUBLIC_WEBSITE_URL!;
  const query = stringify({ date, name, email });
  return link + `/payment/${paymentUid}?${query}`;
}
