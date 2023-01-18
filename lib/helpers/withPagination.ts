import { NextMiddleware } from "next-api-middleware";
import z from "zod";

const withPage = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((n) => parseInt(n)),
  take: z
    .string()
    .optional()
    .default("10")
    .transform((n) => parseInt(n)),
});

export const withPagination: NextMiddleware = async (req, _, next) => {
  const { page, take } = withPage.parse(req.query);
  const skip = (page - 1) * take;
  req.pagination = {
    take,
    skip,
  };
  await next();
};
