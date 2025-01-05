export default function RoutingFormsIndex() {
  return null;
}

export const getServerSideProps = () => {
  return {
    redirect: {
      destination: `/routing/forms`,
      permanent: false,
    },
  };
};
