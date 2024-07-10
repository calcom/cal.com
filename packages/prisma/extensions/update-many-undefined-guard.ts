import { Prisma } from "@prisma/client";

export function updateManyUndefinedGuardExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async updateMany({ model, operation, args, query }) {
          const where = params.args.where;

          if (where) {
            for (const key in where) {
              if (where[key] && where[key].in !== undefined && !Array.isArray(where[key].in)) {
                throw new Error(`The "in" value for the field "${key}" is undefined.`);
              }
            }
          }

          return query(args);
        },
      },
    },
  });
}
