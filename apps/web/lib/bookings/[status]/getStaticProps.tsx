import { type GetStaticProps } from "next";
import { z } from "zod";

import { getTranslations } from "@server/lib/getTranslations";

const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const getStaticProps: GetStaticProps = async (ctx) => {
  const params = querySchema.safeParse(ctx.params);
  const i18n = await getTranslations(ctx);

  if (!params.success) return { notFound: true };

  return {
    props: {
      status: params.data.status,
      i18n,
    },
  };
};
