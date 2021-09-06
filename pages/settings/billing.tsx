import Shell from "@components/Shell";
import SettingsShell from "@components/Settings";
import prisma from "@lib/prisma";
import { getSession } from "@lib/auth";

export default function Billing() {
  return (
    <Shell heading="Billing" subtitle="Manage your billing information and cancel your subscription.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="my-6">
            <iframe
              src="https://calendso.com/subscription-embed"
              style={{ minHeight: 800, width: "100%", border: 0 }}
            />
          </div>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
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
    props: { user }, // will be passed to the page component as props
  };
}
