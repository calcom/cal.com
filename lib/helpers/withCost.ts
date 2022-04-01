// Make a middleware that adds a cost to running the request
// by calling stripeSubscription addCost() * pricePerBooking
// Initially to test out 0,5 cent per booking via API call
// withCost(5)(endpoint)
// Should add a charge of 0.5 cent per booking to the subscription of the user making the request
// Should be called in the middleware of the e
//
import { NextMiddleware } from "next-api-middleware";

export const withCost = (priceInCents: number): NextMiddleware => {
  return async function (req, res, next) {
    console.log(req.headers);
    if (
      priceInCents > 0
      // && stripeCustomerId && stripeSubscriptionId
    ) {
      console.log(priceInCents);
      // if (req.method === allowedHttpMethod || req.method == "OPTIONS") {
      await next();
    } else {
      res.status(405).json({ message: `We weren't able to process the payment for this transaction` });
      res.end();
    }
  };
};
