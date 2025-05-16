import { headers } from "next/headers";

import { withPrismaDataForPage } from "@calcom/prisma/store/withPrismaDataForPage";

export default async function Home() {
  const reqHeaders = await headers();
  const users = await withPrismaDataForPage(reqHeaders, async (prisma) => {
    const user = await prisma.user.findFirst({ where: { id: 1 }, select: { id: true, name: true } });
    return user ? [user] : [];
  });

  return (
    <div>
      <h1>Users for tenant</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
