import { GetServerSidePropsContext } from "next";

import { querySchema } from "./manage";

export default function Type() {
  return <></>;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { uid, allRemainingBookings, cancel: isCancellationMode } = querySchema.parse(context.query);

  return {
    redirect: {
      permanent: false,
      destination: `/manage?uid=${uid}&allRemainingBookings=${allRemainingBookings}&cancel=${isCancellationMode}`,
    },
  };
};
