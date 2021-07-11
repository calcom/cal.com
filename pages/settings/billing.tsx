import Head from 'next/head';
import Shell from '../../components/Shell';
import SettingsShell from '../../components/Settings';
import prisma from '../../lib/prisma';
import {getSession, useSession} from 'next-auth/client';

export default function Billing(props) {
    const [ session, loading ] = useSession();

    if (loading) {
        return <div className="loader"></div>;
    }

  return (
    <Shell heading="Billing">
      <Head>
        <title>Billing | Calendso</title>
      </Head>
      <SettingsShell>
        <div className="py-6 px-4 sm:p-6 lg:pb-8 lg:col-span-9">
          <div className="mb-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Change your Subscription
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Cancel, update credit card or change plan
            </p>
          </div>
          <div className="my-6">
            <iframe
              src="https://calendso.com/subscription-embed"
              style={{minHeight: 800, width: "100%", border: 0 }}
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
        return { redirect: { permanent: false, destination: '/auth/login' } };
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
        }
    });

    return {
      props: {user}, // will be passed to the page component as props
    }
}