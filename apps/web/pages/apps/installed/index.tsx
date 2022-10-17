function RedirectPage() {
  return;
}

export async function getServerSideProps() {
  return { redirect: { permanent: false, destination: "/apps/installed/calendar" } };
}

export default RedirectPage;
