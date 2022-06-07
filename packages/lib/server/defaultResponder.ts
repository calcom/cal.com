import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { ZodError } from "zod";

import { HttpError } from "@calcom/lib/http-error";

type Handle<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T>;

/** Allows us to get type inference from API handler responses */
function defaultResponder<T>(f: Handle<T>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const result = await f(req, res);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.statusCode = err.statusCode;
        res.json({ message: err.message });
      } else if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        console.error("err", err);
        res.statusCode = err.statusCode || 500;
        res.json({ message: "Stripe error: " + err.message });
      } else if (err instanceof ZodError && err.name === "ZodError") {
        console.error("err", JSON.parse(err.message)[0].message);
        res.statusCode = 400;
        res.json({
          message: "Validation errors: " + err.issues.map((i) => `—'${i.path}' ${i.message}`).join(". "),
        });
      } else {
        console.error("err", err);
        res.statusCode = 500;
        res.json({ message: "Unknown error" });
      }
    }
  };
}

export default defaultResponder;
