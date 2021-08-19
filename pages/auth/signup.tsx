import Head from "next/head";
import { useRouter } from "next/router";
import { signIn } from "next-auth/client";
import ErrorAlert from "../../components/ui/alerts/Error";
import { useState } from "react";
import { UsernameInput } from "../../components/ui/UsernameInput";
import prisma from "../../lib/prisma";

export default function Signup(props) {
  const router = useRouter();

  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleErrors = async (resp) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
  };

  const signUp = (e) => {
    e.preventDefault();

    if (e.target.password.value !== e.target.passwordcheck.value) {
      throw new Error("Password mismatch");
    }

    const email: string = e.target.email.value;
    const password: string = e.target.password.value;

    fetch("/api/auth/signup", {
      body: JSON.stringify({
        username: e.target.username.value,
        password,
        email,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(handleErrors)
      .then(() => signIn("Calendso", { callbackUrl: (router.query.callbackUrl || "") as string }))
      .catch((err) => {
        setHasErrors(true);
        setErrorMessage(err.message);
      });
  };

  return (
    <div
      className="flex flex-col justify-center py-12 min-h-screen bg-gray-50 sm:px-6 lg:px-8"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <Head>
        <title>Sign up</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-gray-900 text-3xl font-extrabold">Create your account</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 px-4 py-8 bg-white shadow sm:px-10 sm:rounded-lg">
          <form method="POST" onSubmit={signUp} className="bg-white space-y-6">
            {hasErrors && <ErrorAlert message={errorMessage} />}
            <div>
              <div className="mb-2">
                <UsernameInput required />
              </div>
              <div className="mb-2">
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="jdoe@example.com"
                  disabled={!!props.email}
                  readOnly={!!props.email}
                  value={props.email}
                  className="block mt-1 px-3 py-2 w-full bg-gray-100 border focus:border-black border-gray-300 rounded-md focus:outline-none shadow-sm focus:ring-black sm:text-sm"
                />
              </div>
              <div className="mb-2">
                <label htmlFor="password" className="block text-gray-700 text-sm font-medium">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  placeholder="•••••••••••••"
                  className="block mt-1 px-3 py-2 w-full border focus:border-black border-gray-300 rounded-md focus:outline-none shadow-sm focus:ring-black sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="passwordcheck" className="block text-gray-700 text-sm font-medium">
                  Confirm password
                </label>
                <input
                  type="password"
                  name="passwordcheck"
                  id="passwordcheck"
                  required
                  placeholder="•••••••••••••"
                  className="block mt-1 px-3 py-2 w-full border focus:border-black border-gray-300 rounded-md focus:outline-none shadow-sm focus:ring-black sm:text-sm"
                />
              </div>
            </div>
            <div className="flex mt-3 sm:mt-4">
              <input
                type="submit"
                value="Create Account"
                className="btn btn-primary inline-flex justify-center mr-2 px-4 py-2 w-7/12 text-white text-base font-medium bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md focus:outline-none shadow-sm cursor-pointer focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm"
              />
              <a
                onClick={() =>
                  signIn("Calendso", { callbackUrl: (router.query.callbackUrl || "") as string })
                }
                className="btn inline-flex justify-center px-4 py-2 w-5/12 text-gray-500 text-sm font-medium border rounded cursor-pointer">
                Login instead
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  if (!ctx.query.token) {
    return {
      notFound: true,
    };
  }
  const verificationRequest = await prisma.verificationRequest.findUnique({
    where: {
      token: ctx.query.token,
    },
  });

  // for now, disable if no verificationRequestToken given or token expired
  if (!verificationRequest || verificationRequest.expires < new Date()) {
    return {
      notFound: true,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationRequest.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: { permanent: false, destination: "/auth/login?callbackUrl=" + ctx.query.callbackUrl },
    };
  }

  return { props: { email: verificationRequest.identifier } };
}
