import type { PrismaClient } from "@prisma/client";

function softDeleteMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const { model, action, args } = params;

    if (model === "BookingReference") {
      if (action === "delete") {
        // Transform delete queries to update
        params.action = "update";
        params.args["data"] = { deleted: true };
      } else if (action === "deleteMany") {
        // Transform deleteMany queries to updateMany
        params.action = "updateMany";
        params.args.data = { ...(params.args.data || {}), deleted: true };
      } else if (action === "findUnique") {
        // Change findUnique to findFirst and add 'deleted' filter
        params.action = "findFirst";
        params.args.where["deleted"] = null;
      } else if (action === "findMany" || action === "findFirst") {
        // Transform findMany and findFirst queries to exclude deleted records
        params.args.where = { ...(params.args.where || {}), deleted: null };
      }
    }

    return next(params);
  });
}

export default softDeleteMiddleware;

        }
      }
    }
    return next(params);
  });
}

export default middleware;
