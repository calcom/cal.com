import type { GetServerSidePropsContext } from "next";

import { withPrismaSsr } from "@calcom/prisma/store/withPrismaSsr";

export const getServerSideProps = withPrismaSsr(async (ctx: GetServerSidePropsContext, prisma) => {
  const user = await prisma.user.findFirst({ where: { id: 1 }, select: { id: true, name: true } });
  return { props: { users: [user] } };
});

export default function Home({ users }: { users: { id: number; name: string }[] }) {
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
