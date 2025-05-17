import type { PrismaClient } from "@prisma/client";

import { withPrismaPage } from "@calcom/prisma/store/withPrismaPage";

interface HomePageProps {
  prisma: PrismaClient;
  host: string; // host can be used if needed, e.g. for display
}

// This is the actual page component logic, now cleaner.
async function HomePageContent({ prisma, host }: HomePageProps) {
  const users = await prisma.user.findMany({ where: { id: 1 }, select: { id: true, name: true } });

  return (
    <div>
      <h1>Users for tenant ({host})</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}

// Wrap the page content component with the HOC
const Home = withPrismaPage(HomePageContent);

export default Home;
