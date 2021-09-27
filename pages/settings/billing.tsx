import { GetServerSidePropsContext } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import SettingsShell from "@components/Settings";
import Shell from "@components/Shell";
import Button from "@components/ui/Button";

export default function Billing() {
  return (
    <Shell heading="Billing" subtitle="Manage your billing information and cancel your subscription.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="my-6">
            <form method="POST" action="/api/integrations/stripepayment/portal">
              <Button type="submit">Manage billing</Button>
            </form>
          </div>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
    },
  });

  return {
    props: { session, user },
  };
}
