import { NextMiddleware } from "next-api-middleware";
import z from "zod";

const withPage = z.object({
  page: z
    .string()
    .min(1)
    .default("1")
    .transform((n) => parseInt(n)),
  take: z
    .string()
    .min(10)
    .max(100)
    .default("10")
    .transform((n) => parseInt(n)),
});

export const withPagination: NextMiddleware = async (req, _, next) => {
  const { page, take } = withPage.parse(req.query);
  const skip = page * take;
  req.pagination = {
    take: take || 10,
    skip: skip || 0,
  };
  await next();
};
