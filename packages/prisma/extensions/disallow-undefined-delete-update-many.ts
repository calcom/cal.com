import { Prisma } from "@prisma/client";

export const checkUndefinedInValue = (where: any) => {
  if (where) {
    for (const key in where) {
      // INFO: Since this is for $allModels, we don't have a way to get the correct
      // where type
      const whereInput = where[key as any] as unknown;
      if (!whereInput) {
        throw new Error(`The value for the field "${key}" cannot be undefined.`);
      }

      if (whereInput.hasOwnProperty("in") && typeof whereInput.in === "undefined") {
        throw new Error(`The "in" value for the field "${key}" cannot be undefined.`);
      }
    }
  }
};

export function disallowUndefinedInDeleteUpdateManyExtension() {
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
