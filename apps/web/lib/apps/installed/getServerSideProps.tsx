export async function getServerSideProps() {
  return { redirect: { permanent: false, destination: "/apps/installed/calendar" } };
}
