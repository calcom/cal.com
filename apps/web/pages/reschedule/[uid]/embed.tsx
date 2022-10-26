import { GetServerSidePropsContext, NextPage } from "next";

const RescheduleEmbed: NextPage = () => {
  return <div>RescheduleEmbed</div>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    redirect: {
      destination: `/reschedule/${context?.query?.uid}`,
    },
  };
}

export default RescheduleEmbed;
