import { Prisma } from "@prisma/client";

const checkUndefinedInValue = (where: any) => {
  if (where) {
    for (const key in where) {
      // INFO: Since this is for $allModels, we don't have a way to get the correct
      // where type
      const whereInput = where[key as any] as any;
      if (whereInput.hasOwnProperty("in") && whereInput.in === undefined) {
        throw new Error(`The "in" value for the field "${key}" is undefined.`);
      }
    }
  }
};

export function disallowUndefinedDeleteUpdateManyExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async deleteMany({ model, operation, args, query }) {
          checkUndefinedInValue(args.where);
          return query(args);
        },
        async updateMany({ model, operation, args, query }) {
          checkUndefinedInValue(args.where);
          return query(args);
        },
      },
    },
  });
}
