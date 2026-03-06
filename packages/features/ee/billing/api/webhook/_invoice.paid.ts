import process from "node:process";
import type { SWHMap } from "./__handler";
import { productRouter } from "./__handler";

type Data = SWHMap["invoice.paid"]["data"];

// We can't crash here if these are not set, because not all self-hosters use Organizations/Teams and it might break the build on import of this module.
const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID || "";
const STRIPE_TEAM_PRODUCT_ID = process.env.STRIPE_TEAM_PRODUCT_ID || "";

function extractProductId(data: Data): string | null {
  const invoice = data.object;
  if (!invoice.subscription) return null;
  return (invoice.lines.data[0]?.price?.product as string) ?? null;
}

export default productRouter<Data>(
  {
    [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
    [STRIPE_TEAM_PRODUCT_ID]: () => import("./_invoice.paid.team"),
  },
  extractProductId
);
