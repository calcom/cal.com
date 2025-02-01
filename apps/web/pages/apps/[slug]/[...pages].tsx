import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    notFound: true, // This will let Next.js handle the routing through the pages directory
  };
};

export default function AppPage() {
  return null;
}
