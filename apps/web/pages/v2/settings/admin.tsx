import { GetStaticProps } from "next";

import Shell from "@calcom/ui/v2/Shell";

const index = () => {
  return <Shell />;
};

export const getStaticProps: GetStaticProps = async (ctx) => {
  return {
    props: {
      data: null,
    },
  };
};

export default index;
