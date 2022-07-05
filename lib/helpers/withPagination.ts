import { NextMiddleware } from "next-api-middleware";

export const withPagination: NextMiddleware = async (req, res, next) => {
  const { page } = req.query;
  const pageNumber = parseInt(page as string);
  const skip = pageNumber * 10;
  req.pagination = {
    take: 10,
    skip: skip || 0,
  };
  await next();
};
