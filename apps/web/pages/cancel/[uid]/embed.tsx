import { GetServerSidePropsContext, NextPage } from "next";

const CancelEmbed: NextPage = () => {
  return <div>CancelEmbed</div>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    redirect: {
      destination: `/cancel/${context?.query?.uid}`,
    },
  };
}

export default CancelEmbed;
