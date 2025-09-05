import { prisma } from "@calcom/prisma";
import { v4 as uuidv4 } from "uuid";

type Route = {
  id: string;
  action: {
    type: string;
    value: string;
  };
  isFallback: boolean;
  queryValue: {
    id: string;
    type: string;
  };
};

export const createRoutingFormsFixture = () => {
  return {
    async create({
      userId,
      teamId,
      name,
      fields,
      routes = [],
    }: {
      name: string;
      userId: number;
      teamId: number | null;
      routes?: Route[];
      fields: {
        type: string;
        label: string;
        identifier?: string;
        required: boolean;
        options?: {
          label: string;
          id: string | null;
        }[];
      }[];
    }) {
      return await prisma.app_RoutingForms_Form.create({
        data: {
          name,
          userId,
          teamId,
          routes: [
            ...routes,
            // Add a fallback route always, this is taken care of tRPC route normally but do it manually while running the query directly.
            {
              id: "898899aa-4567-489a-bcde-f1823f708646",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "898899aa-4567-489a-bcde-f1823f708646", type: "group" },
            },
          ],
          fields: fields.map((f) => ({
            id: uuidv4(),
            ...f,
          })),
        },
      });
    },
  };
};
