import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

export default createNextApiHandler(viewerOrganizationsRouter);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // default body size limit of 1MB is not enough for images
    },
  },
};
