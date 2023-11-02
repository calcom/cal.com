import { wrapApiHandlerWithSentry } from "@sentry/nextjs";

const handler = (req, res) => {
  throw new Error("Unexpected error DIRECT IN SLOTS ROUTE. Does it go to Sentry?");
  res.status(200).json({ name: "John Doe" });
};

export default wrapApiHandlerWithSentry(handler, "/api/trpc/slots/[trpc]");
