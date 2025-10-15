import logger from "@calcom/lib/logger";

import {
  STRIPE_TEAM_PRODUCT_ID,
  STRIPE_ORG_PRODUCT_ID,
  STRIPE_CAL_AI_PHONE_NUMBER_PRODUCT_ID,
} from "../../../lib/constants";
import { HttpCode } from "../../../lib/httpCode";
import type { Handlers, SWHMap } from "../../../lib/types";

type Data = SWHMap["customer.subscription.updated"]["data"];
const handler = (handlers: Handlers) => async (data: Data) => {
  const log = logger.getSubLogger({ prefix: ["stripe customer.subscription.updated"] });
  const subscription = data.object;

  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  const results = [];

  for (const item of subscription.items.data) {
    const productId = item.price.product;
    if (!productId) continue;

    const handlerGetter = handlers[productId as keyof Handlers];

    if (!handlerGetter) {
      log.warn(`No handler found for product ID ${productId}`);
      continue;
    }

    const handler = (await handlerGetter())?.default;
    if (!handler) {
      log.warn(`No handler found for product ID ${productId}`);
      continue;
    }

    const result = await handler({ ...data, productId });
    results.push(result);
  }

  if (results.length > 0) {
    log.warn(`Subscription ${subscription.id} contains multiple tracked products`);
  }

  return results[0];
};

const productUpdateHandlers = {
  [STRIPE_TEAM_PRODUCT_ID]: () => import("./_teamAndOrgUpdateHandler"),
  [STRIPE_ORG_PRODUCT_ID]: () => import("./_teamAndOrgUpdateHandler"),
  [STRIPE_CAL_AI_PHONE_NUMBER_PRODUCT_ID]: () => import("./_calAIPhoneNumberUpdateHandler"),
};

export default handler(productUpdateHandlers);
