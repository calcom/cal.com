import { WEBAPP_URL } from "@calcom/lib/constants";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

const tokenSchema = z.object({
  token: z.string(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const parsed = tokenSchema.safeParse(context.query);
  if (!parsed.success) {
    return {
      notFound: true,
    } as const;
  }
  const { token } = parsed.data;

  if (!token) {
    return {
      notFound: true,
    } as const;
  }

  const params = new URLSearchParams({
    token,
  });

  const response = await fetch(`${WEBAPP_URL}/api/auth/verify-email?${params.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    return {
      props: {
        updateSession: false,
        token,
        updatedEmail: false,
      },
    };
  }

  const data = await response.json();

  return {
    props: {
      updateSession: true,
      token,
      updatedEmail: data.updatedEmail ?? null,
    },
  };
}
