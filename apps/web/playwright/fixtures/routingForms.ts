import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

export const createRoutingFormsFixture = () => {
  return {
    async create({
      userId,
      teamId,
      name,
      fields,
    }: {
      name: string;
      userId: number;
      teamId: number | null;
      fields: {
        type: string;
        label: string;
        identifier?: string;
        required: boolean;
      }[];
    }) {
      return await prisma.app_RoutingForms_Form.create({
        data: {
          name,
          userId,
          teamId,
          routes: [
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
