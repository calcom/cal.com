import { Prisma } from "@prisma/client";

export const validateWhereClause = (where: any) => {
  // Check if where is undefined
  if (where === undefined) {
    throw new Error('The "where" clause cannot be undefined.');
  }

  // Check if where is an empty object
  if (typeof where === "object" && !Array.isArray(where) && Object.keys(where || {}).length === 0) {
    throw new Error('The "where" clause cannot be an empty object {}.');
  }

  // Check if where is an empty array
  if (Array.isArray(where) && where.length === 0) {
    throw new Error('The "where" clause cannot be an empty array [].');
  }

  if (where) {
    for (const key in where) {
      // INFO: Since this is for $allModels, we don't have a way to get the correct
      // where type
      const whereInput = where[key as any] as any;
      let message;
      if (whereInput === undefined) {
        message = `The value for the field "${key}" cannot be undefined.`;
        throw new Error(message);
      }

      if (whereInput === null) {
        continue;
      }

      if (whereInput.hasOwnProperty("in") && typeof whereInput.in === "undefined") {
        message = `The "in" value for the field "${key}" cannot be undefined.`;
        throw new Error(message);
      }
    }
  }
};

export function disallowUndefinedWhereExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async deleteMany({ args, query }) {
          validateWhereClause(args.where);
          return query(args);
        },
        async updateMany({ args, query }) {
          validateWhereClause(args.where);
          return query(args);
        },
        async findMany({ args, query }) {
          validateWhereClause(args.where);
          return query(args);
        },
      },
    },
  });
}
