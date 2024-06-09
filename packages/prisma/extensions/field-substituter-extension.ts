import { Prisma } from "@prisma/client";

function fieldSustitutersExtension() {
  return Prisma.defineExtension({
    query: {
      user: {},
      team: {},
    },
  });
}

export default fieldSustitutersExtension;
