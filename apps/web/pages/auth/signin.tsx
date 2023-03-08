import type { GetServerSidePropsContext } from "next";
import { getProviders, signIn, getCsrfToken } from "next-auth/react";
import { AUTH_OPTIONS } from "pages/api/auth/[...nextauth]";

import { getServerSession } from "@calcom/lib/auth";
import { Button } from "@calcom/ui";

type Provider = {
  name: string;
  id: string;
};

function signin({ providers }: { providers: Provider[] }) {
  return (
    <div className="center mt-10 justify-between space-y-5 text-center align-baseline">
      {Object.values(providers).map((provider) => {
        return (
          <div key={provider.name}>
            <Button onClick={() => signIn(provider.id)}>Sign in with {provider.name}</Button>
          </div>
        );
      })}
    </div>
  );
}

export default signin;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res } = context;

  const session = await getServerSession({ req, res, authOptions: AUTH_OPTIONS });
  const csrfToken = await getCsrfToken(context);
  const providers = await getProviders();
  if (session) {
    return {
      redirect: { destination: "/" },
    };
  }
  return {
    props: {
      csrfToken,
      providers,
    },
  };
}
