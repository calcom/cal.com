import type { NextMiddleware } from "next-api-middleware";
import z from "zod";

const withPage = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  take: z.coerce.number().min(1).optional().default(10),
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
