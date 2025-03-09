import type { GetServerSidePropsContext } from "next";
import fs from "fs";
import path from "path";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

function RedirectPage({ htmlContent }: { htmlContent?: string }) {
  if (htmlContent) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }
  return null;
}

export async function getServerSideProps({ req, res }: GetServerSidePropsContext) {
  const session = await getServerSession({ req, res });

  // If the user is logged in, redirect to event-types
  if (session?.user?.id) {
    return { redirect: { permanent: false, destination: "/event-types" } };
  }

  // For non-authenticated users, read and serve home.html content
  try {
    const homeFilePath = path.join(process.cwd(), 'public', 'home.html');
    const htmlContent = fs.readFileSync(homeFilePath, 'utf8');
    return {
      props: { htmlContent },
    };
  } catch (error) {
    console.error("Failed to read home.html:", error);
    return {
      props: { htmlContent: "<h1>Welcome to the application</h1><p>Home page content unavailable.</p>" },
    };
  }
}

export default RedirectPage;
