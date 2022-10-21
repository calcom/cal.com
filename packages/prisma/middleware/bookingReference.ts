import { PrismaClient } from "@prisma/client";

function middleware(prisma: PrismaClient) {
  /***********************************/
  /* SOFT DELETE MIDDLEWARE */
  /***********************************/
  prisma.$use(async (params, next) => {
    // Check incoming query type

    if (params.model === "BookingReference") {
      if (params.action === "delete") {
        // Delete queries
        // Change action to an update
        params.action = "update";
        params.args["data"] = { deleted: true };
      }
      if (params.action === "deleteMany") {
        // Delete many queries
        params.action = "updateMany";
        if (params.args.data !== undefined) {
          params.args.data["deleted"] = true;
        } else {
          params.args["data"] = { deleted: true };
        }
      }
      if (params.action === "findUnique") {
        // Change to findFirst - you cannot filter
        // by anything except ID / unique with findUnique
        params.action = "findFirst";
        // Add 'deleted' filter
        // ID filter maintained
        params.args.where["deleted"] = null;
      }
      if (params.action === "findMany" || params.action === "findFirst") {
        // Find many queries
        if (params.args.where !== undefined) {
          if (params.args.where.deleted === undefined) {
            // Exclude deleted records if they have not been explicitly requested
            params.args.where["deleted"] = null;
          }
        } else {
          params.args["where"] = { deleted: null };
        }
      }
    }
    return next(params);
  });
}

export default middleware;
