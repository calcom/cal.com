import { Prisma } from "@prisma/client";

const checkUndefined = (where: any) => {
  if (where) {
    for (const key in where) {
      // INFO: Since this is for $allModels, we don't have a way to get the correct
      // where type
      // @ts-expect-error Element implicitly has any type
      const whereInput = where[key as any] as any;
      if (whereInput?.in === undefined || (whereInput?.in !== undefined && !Array.isArray(whereInput.in))) {
        throw new Error(`The "in" value for the field "${key}" is undefined.`);
      }
    }
  }
};

export function undefinedGuardExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async deleteMany({ model, operation, args, query }) {
          checkUndefined(args.where);
          return query(args);
        },
        async updateMany({ model, operation, args, query }) {
          checkUndefined(args.where);
          return query(args);
        },
      },
    },
  });
}
