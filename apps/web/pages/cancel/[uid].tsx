import { GetServerSidePropsContext } from "next";
import z from "zod";

const querySchema = z.object({
  uid: z.string(),
  allRemainingBookings: z
    .string()
    .optional()
    .transform((val) => (val ? JSON.parse(val) : false)),
});

export default function Type() {
  return <></>;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { allRemainingBookings, uid } = querySchema.parse(context.query);
  return {
    redirect: {
      permanent: false,
      destination: `/success?uid=${uid}&allRemainingBookings=${allRemainingBookings}&cancel=true`,
    },
  };
};
