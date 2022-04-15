import { label } from "next-api-middleware";

import { withCors } from "./withCors";

const withCorsMiddleware = label(
  {
    withCors,
  },
  ["withCors"] // <-- Provide a list of middleware to call automatically
);

export { withCorsMiddleware };
