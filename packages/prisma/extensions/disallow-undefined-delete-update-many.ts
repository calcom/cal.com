import { Prisma } from "@prisma/client";

export const checkUndefinedInValue = (where: any) => {
  if (where) {
    for (const key in where) {
      // INFO: Since this is for $allModels, we don't have a way to get the correct
      // where type
      const whereInput = where[key as any] as any;
      let message;
      if (!whereInput) {
        message = `The value for the field "${key}" cannot be undefined.`;
        console.log(message);
        throw new Error(message);
      }

      if (whereInput.hasOwnProperty("in") && typeof whereInput.in === "undefined") {
        message = `The "in" value for the field "${key}" cannot be undefined.`;
        console.log(message);
        throw new Error(message);
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
