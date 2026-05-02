import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext): Promise<{ props: Record<string, never> } | { redirect: { permanent: boolean; destination: string } }> => {
  const { req } = ctx;

  const { getServerSession } = await import("@calcom/features/auth/lib/getServerSession");
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    } as const;
  }

  return {
    props: {} as Record<string, never>,
  };
};
