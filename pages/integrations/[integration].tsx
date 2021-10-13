function RedirectPage() {
  return null;
}

export async function getServerSideProps() {
  return { redirect: { permanent: false, destination: "/integrations" } };
}

export default RedirectPage;
