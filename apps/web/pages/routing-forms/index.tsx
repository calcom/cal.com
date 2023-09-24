export default function RoutingFormsIndex() {
  return null;
}

export const getServerSideProps = () => {
  return {
    notFound: true,
  };
  return {
    redirect: {
      destination: `/apps/routing-forms/forms`,
      permanent: false,
    },
  };
};
