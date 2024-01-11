import type { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (_context: GetServerSidePropsContext) => {
  const EMAIL_FROM = process.env.EMAIL_FROM;

  return {
    props: {
      EMAIL_FROM,
    },
  };
};
